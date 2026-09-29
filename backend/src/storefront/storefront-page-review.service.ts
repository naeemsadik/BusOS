import { Injectable } from '@nestjs/common';
import { StorefrontDocument, StorefrontSeoSettings } from './storefront.types';

export interface StorefrontReviewIssue {
  severity: 'mustFix' | 'recommended' | 'information';
  code: string;
  message: string;
  sectionId?: string;
  field?: string;
}

@Injectable()
export class StorefrontPageReviewService {
  review(
    document: StorefrontDocument,
    seo: StorefrontSeoSettings,
    enabledLocales: string[],
    pageType?: string,
  ): StorefrontReviewIssue[] {
    const issues: StorefrontReviewIssue[] = [];
    if (!document.sections.some((section) => section.visible))
      issues.push({
        severity: 'recommended',
        code: 'empty-page',
        message: 'This page has no visible sections.',
      });
    for (const section of document.sections) {
      if (!section.visible) continue;
      const content = section.content;
      if (
        content.ctaHref &&
        !/^\/(?!\/)[a-z0-9/_?#=&.%+-]*$/i.test(content.ctaHref) &&
        !/^https:\/\//i.test(content.ctaHref)
      )
        issues.push({
          severity: 'mustFix',
          code: 'unsafe-link',
          message: 'Use an internal link or a secure HTTPS link.',
          sectionId: section.id,
          field: 'ctaHref',
        });
      if (content.imageUrl && !content.imageAlt?.en?.trim())
        issues.push({
          severity: 'recommended',
          code: 'missing-alt',
          message:
            'Add English alternative text or mark a decorative image in a future release.',
          sectionId: section.id,
          field: 'imageAlt',
        });
      if (
        content.ctaLabel?.en &&
        /^(click here|learn more)$/i.test(content.ctaLabel.en.trim())
      )
        issues.push({
          severity: 'recommended',
          code: 'vague-cta',
          message: 'Use a button label that describes what happens next.',
          sectionId: section.id,
          field: 'ctaLabel',
        });
      if (enabledLocales.includes('bn')) {
        for (const field of [
          'title',
          'body',
          'ctaLabel',
          'imageAlt',
          'hours',
        ] as const)
          if (content[field]?.en && !content[field]?.bn)
            issues.push({
              severity: 'recommended',
              code: 'missing-translation',
              message: `Bangla ${field} is missing and will fall back to English.`,
              sectionId: section.id,
              field,
            });
      }
      if (section.type === 'promotionalBanner') {
        const text = `${content.title?.en || ''} ${content.body?.en || ''}`;
        if (
          /\b(discount|off|offer|sale)\b/i.test(text) &&
          !/\b\d{4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(
            text,
          )
        )
          issues.push({
            severity: 'mustFix',
            code: 'promotion-dates',
            message:
              'Add verified promotion dates or remove the time-limited offer claim.',
            sectionId: section.id,
          });
      }
    }
    if (!seo.title?.en?.trim())
      issues.push({
        severity: 'mustFix',
        code: 'seo-title',
        message: 'Add an English SEO title.',
      });
    if (!seo.description?.en?.trim())
      issues.push({
        severity: 'recommended',
        code: 'seo-description',
        message: 'Add an SEO description.',
      });
    if (seo.title?.en && seo.title.en.length > 60)
      issues.push({
        severity: 'recommended',
        code: 'long-seo-title',
        message: 'Keep the SEO title near 60 characters.',
      });
    if (
      !document.sections.some(
        (section) => section.visible && section.content.ctaHref,
      ) &&
      !['about', 'faq', 'custom'].includes(pageType || '')
    )
      issues.push({
        severity: 'recommended',
        code: 'missing-action',
        message: 'Consider adding a clear visitor action.',
      });
    return issues;
  }
}
