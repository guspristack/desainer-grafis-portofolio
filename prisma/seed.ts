import { readFile } from 'node:fs/promises';
import { disconnectDatabase, prisma } from '../server/database';
import { preparePhoto } from '../server/images';
import { projects } from './fixtures';

async function sample(file: string, title: string, kind: string, alt: string, position: number) {
  const input = await readFile(new URL('../src/images/' + file + '.webp', import.meta.url));
  return { title, kind, alt, position, credit: 'Mockup generatif · ImageGen', ...await preparePhoto(input) };
}

try {
  for (const [index, { id: slug, file, alt, role, palette, ...content }] of projects.entries()) {
    if (await prisma.caseStudy.findUnique({ where: { slug }, select: { id: true } })) continue;
    const images = [await sample(file, content.name + ' · Sampul', 'Sampul', alt, 10)];
    const temu = slug === 'temu';
    if (temu) {
      images.push(
        await sample('temu-application', 'Penerapan pada kaleng dan tas', 'Mockup', 'Kaleng teh hijau dan tas katun dengan identitas TEMU.', 20),
        await sample('temu-dua-varian', 'Dua varian, satu tata letak', 'Perbandingan varian', 'Dua kaleng Temu hijau dan kuning dengan tata letak dan motif daun yang selaras.', 30),
      );
    }
    await prisma.caseStudy.create({
      data: {
        ...content, slug, credit: 'Sora Anindya · ' + role, palette: palette.map((value) => value.toUpperCase()),
        wordmark: temu ? 'TEMU' : '', typeface: temu ? 'Manrope' : '', position: (index + 1) * 10, published: true,
        assets: { createMany: { data: images } },
        ...(temu ? { variants: { createMany: { data: [
          { name: 'Teh hijau', description: 'Warna hijau menandai varian teh hijau.', color: '#A8CC5E', position: 10 },
          { name: 'Teh lemon', description: 'Warna kuning dengan posisi wordmark dan motif yang sama.', color: '#F4E590', position: 20 },
        ] } } } : {}),
      },
    });
  }
  console.log('Studi kasus dan aset contoh tersedia.');
} finally {
  await disconnectDatabase();
}
