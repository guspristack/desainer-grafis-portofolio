import { z } from 'zod';

export const categories = ['Kemasan', 'Poster', 'Editorial', 'Identitas visual'] as const;
export const assetKinds = ['Sampul', 'Logo', 'Mockup', 'Tipografi', 'Perbandingan varian', 'Lainnya'] as const;
export const maxUploadBytes = 12 * 1024 * 1024;
const line = (max: number) => z.string().trim().min(1).max(max);
const optionalLine = (max: number) => z.string().trim().max(max);
const position = z.number().int().min(0).max(9999);
const assetId = z.number().int().min(1).max(2147483647);
const color = z.string().trim().regex(/^#[a-f\d]{6}$/i, 'Gunakan format #RRGGBB.').toUpperCase();
export const slugSchema = z.string().min(2).max(90).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Gunakan huruf kecil, angka, dan tanda hubung.');
export const caseSchema = z.strictObject({
  name: line(100), category: z.enum(categories), description: optionalLine(350), brief: optionalLine(4500),
  credit: optionalLine(220), deliverable: optionalLine(650), palette: z.array(color).max(8),
  wordmark: optionalLine(32), typeface: optionalLine(90), position, published: z.boolean(),
});
export const assetSchema = z.strictObject({
  title: line(100), kind: z.enum(assetKinds), alt: line(220), credit: optionalLine(180), position,
});
export const variantSchema = z.strictObject({
  name: line(100), description: optionalLine(650), color: color.or(z.literal('')), assetId: assetId.nullable(), position,
});
export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()), password: z.string().min(1).max(256),
});
export const revision = z.number().int().min(1).max(2147483646);
export type CaseInput = z.infer<typeof caseSchema>;
export type AssetInput = z.infer<typeof assetSchema>;
export type VariantInput = z.infer<typeof variantSchema>;
export type BrandAsset = AssetInput & { id: number; width: number; height: number };
export type Variant = VariantInput & { id: number };
export type CaseStudy = CaseInput & { id: number; slug: string; revision: number; assets: BrandAsset[]; variants: Variant[] };

export function slugFromTitle(title: string) {
  return title.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90).replace(/-$/, '');
}

export function assetUrl(id: number, options: { admin?: boolean; full?: boolean } = {}) {
  return '/api/' + (options.admin ? 'admin/' : '') + 'media/' + id + (options.full ? '?size=full' : '');
}
