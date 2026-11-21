import portrait from './images/portrait-sora.webp';

export type SocialLink = { platform: 'instagram' | 'linkedin' | 'behance'; url?: string };
export type PortfolioMedia = { portrait: string; socials: readonly SocialLink[] };

export const portfolioMedia = {
  sora: { portrait, socials: [{ platform: 'instagram' }, { platform: 'linkedin' }, { platform: 'behance' }] },
} satisfies Record<string, PortfolioMedia>;
