import { portfolioMedia, type PortfolioMedia } from './portfolioMedia';

export type PortfolioProfile = {
  id: string;
  name: string;
  profession: string;
  location: string;
  bio: string;
  specialty: string;
  contactFor: string;
  media: PortfolioMedia;
  experience: ReadonlyArray<{ period: string; title: string; description: string }>;
};

export const profiles = {
  sora: {
    id: 'sora',
    media: portfolioMedia.sora,
    name: 'Sora Anindya',
    profession: 'Desainer grafis',
    location: 'Bandung, Indonesia',
    bio: 'Saya mengembangkan identitas visual lewat tipografi, warna, dan material cetak. Saya mulai dari karakter yang ingin disampaikan, lalu menerjemahkannya ke susunan yang konsisten di beberapa format.',
    specialty: 'Identitas visual, kemasan, poster, dan desain editorial',
    contactFor: 'Untuk proyek identitas visual, kemasan produk, poster, dan publikasi.',
    experience: [
      { period: 'Feb–Okt 2026', title: 'Eksplorasi identitas dan kemasan', description: 'Mengembangkan arah visual Temu dan Pagi, termasuk palet, wordmark, dan konsep pembeda varian.' },
      { period: 'Jul–Nov 2025', title: 'Studi poster dan publikasi', description: 'Menguji hierarki tipografi untuk poster Irama dan sistem kisi untuk katalog Jeda.' },
    ],
  },
} satisfies Record<string, PortfolioProfile>;
