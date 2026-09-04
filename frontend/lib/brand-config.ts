/**
 * Brand configuration utility
 * Provides centralized brand information from environment variables
 */

export const brandConfig = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'BizOS',
  description: 'Complete business management solution',
  tagline: 'Complete POS and business management solution',
  shortDescription: 'by Kanect',
  websiteUrl: 'https://www.kanect.live',
  fullDescription: 'Complete business management solution built with modern web technologies for scalability and performance.',
  copyright: `© ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_BRAND_NAME || 'BizOS'}. All rights reserved.`
} as const;

export const getBrandName = () => brandConfig.name;
export const getBrandDescription = () => brandConfig.description;
export const getBrandTagline = () => brandConfig.tagline;
export const getBrandShortDescription = () => brandConfig.shortDescription;
export const getBrandFullDescription = () => brandConfig.fullDescription;
export const getBrandCopyright = () => brandConfig.copyright;
