import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { assetSchema, caseSchema, maxUploadBytes, revision, slugSchema, variantSchema, type CaseInput } from '../shared/content';
import { prisma } from './database';
import { contentId, HttpError, limitRequests, validate } from './http';
import { preparePhoto } from './images';

const assetMeta = { id: true, title: true, kind: true, alt: true, credit: true, position: true, width: true, height: true } as const;
const variantMeta = { id: true, name: true, description: true, color: true, assetId: true, position: true } as const;
const order = [{ position: 'asc' as const }, { id: 'asc' as const }];
const details = { assets: { orderBy: order, select: assetMeta }, variants: { orderBy: order, select: variantMeta } };
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxUploadBytes, files: 1, fields: 5, fieldSize: 4096, parts: 8 } });

function publication(data: CaseInput) {
  if (data.published && (!data.description || !data.brief || !data.credit || !data.deliverable)) {
    throw new HttpError(400, 'Isi ringkasan, studi kasus, kredit, dan hasil sebelum menerbitkan.');
  }
}

async function sendImage(req: Request, res: Response, publicOnly: boolean) {
  const id = contentId(req.params.id);
  const image = await prisma.brandAsset.findFirst({
    where: { id, ...(publicOnly ? { project: { published: true } } : {}) },
    select: req.query.size === 'full' ? { full: true } : { thumbnail: true },
  });
  const bytes = image?.full ?? image?.thumbnail;
  if (!bytes) throw new HttpError(404, 'Aset tidak tersedia.');
  res.type('image/webp').send(Buffer.from(bytes));
}

export const publicRoutes = Router();
publicRoutes.get('/cases', async (_req, res) => {
  res.json(await prisma.caseStudy.findMany({ where: { published: true }, include: details, orderBy: order }));
});
publicRoutes.get('/media/:id', (req, res) => sendImage(req, res, true));

export const adminRoutes = Router();
adminRoutes.get('/cases', async (_req, res) => {
  res.json(await prisma.caseStudy.findMany({ include: details, orderBy: order }));
});
adminRoutes.get('/media/:id', (req, res) => sendImage(req, res, false));
adminRoutes.post('/cases', async (req, res) => {
  const data = validate(caseSchema.extend({ slug: slugSchema }), req.body);
  publication(data);
  res.status(201).json(await prisma.caseStudy.create({ data, include: details }));
});
adminRoutes.put('/cases/:id', async (req, res) => {
  const id = contentId(req.params.id);
  const { revision: version, ...data } = validate(caseSchema.extend({ revision }), req.body);
  publication(data);
  const updated = await prisma.$transaction(async (db) => {
    const changed = await db.caseStudy.updateMany({
      where: { id, revision: version }, data: { ...data, revision: { increment: 1 } },
    });
    if (!changed.count) throw new HttpError(409, 'Studi kasus sudah berubah. Muat ulang studio.');
    return db.caseStudy.findUniqueOrThrow({ where: { id }, include: details });
  });
  res.json(updated);
});
adminRoutes.delete('/cases/:id', async (req, res) => {
  const id = contentId(req.params.id);
  const { revision: version } = validate(z.strictObject({ revision }), req.body);
  const deleted = await prisma.caseStudy.deleteMany({ where: { id, revision: version, published: false } });
  if (!deleted.count) throw new HttpError(409, 'Sembunyikan studi kasus atau muat ulang sebelum menghapusnya.');
  res.sendStatus(204);
});

let processing = 0;
adminRoutes.post('/cases/:id/assets', limitRequests(32, 10 * 60 * 1000, 'Terlalu banyak unggahan. Coba lagi nanti.'), upload.single('image'), async (req, res) => {
  const caseId = contentId(req.params.id);
  const multipart = z.strictObject({ ...assetSchema.shape, position: z.coerce.number().pipe(assetSchema.shape.position) });
  const data = validate(multipart, req.body);
  if (!req.file?.buffer.length) throw new HttpError(400, 'Pilih satu file gambar.');
  if (processing >= 2) throw new HttpError(429, 'Aset sedang diproses. Coba lagi sebentar.');
  processing++;
  try {
    const image = await preparePhoto(req.file.buffer).catch(() => {
      throw new HttpError(415, 'Unggah JPEG, PNG, atau WebP yang valid, maksimal 30 megapiksel.');
    });
    res.status(201).json(await prisma.brandAsset.create({ data: { ...data, caseId, ...image }, select: assetMeta }));
  } finally {
    processing--;
  }
});
adminRoutes.put('/cases/:caseId/assets/:id', async (req, res) => {
  const where = { caseId: contentId(req.params.caseId), id: contentId(req.params.id) };
  res.json(await prisma.brandAsset.update({ where, data: validate(assetSchema, req.body), select: assetMeta }));
});
adminRoutes.delete('/cases/:caseId/assets/:id', async (req, res) => {
  await prisma.brandAsset.delete({ where: { caseId: contentId(req.params.caseId), id: contentId(req.params.id) } });
  res.sendStatus(204);
});

async function confirmAsset(caseId: number, assetId: number | null) {
  if (assetId === null) return;
  const asset = await prisma.brandAsset.findUnique({ where: { id: assetId, caseId }, select: { id: true } });
  if (!asset) throw new HttpError(400, 'Pilih aset dari studi kasus yang sama.');
}

adminRoutes.post('/cases/:id/variants', async (req, res) => {
  const caseId = contentId(req.params.id);
  const data = validate(variantSchema, req.body);
  await confirmAsset(caseId, data.assetId);
  res.status(201).json(await prisma.variant.create({ data: { ...data, caseId }, select: variantMeta }));
});
adminRoutes.put('/cases/:caseId/variants/:id', async (req, res) => {
  const caseId = contentId(req.params.caseId);
  const data = validate(variantSchema, req.body);
  await confirmAsset(caseId, data.assetId);
  res.json(await prisma.variant.update({ where: { caseId, id: contentId(req.params.id) }, data, select: variantMeta }));
});
adminRoutes.delete('/cases/:caseId/variants/:id', async (req, res) => {
  await prisma.variant.delete({ where: { caseId: contentId(req.params.caseId), id: contentId(req.params.id) } });
  res.sendStatus(204);
});
