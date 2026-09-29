import { StorefrontPageReviewService } from './storefront-page-review.service';
import { pageTemplate } from './storefront-page.templates';

describe('CMS page templates and publish review', () => {
  const reviews = new StorefrontPageReviewService();

  it('creates valid deterministic templates for every page type', () => {
    for (const type of [
      'home',
      'about',
      'contact',
      'promotion',
      'landing',
      'delivery',
      'faq',
      'custom',
    ]) {
      const document = pageTemplate(type, 'template');
      expect(document.version).toBe(1);
      expect(document.sections.length).toBeGreaterThan(0);
      expect(document.sections.length).toBeLessThanOrEqual(30);
    }
  });

  it('allows incomplete guided input without inventing facts', () => {
    const document = pageTemplate('promotion', 'guided', {
      purpose: 'Eid offer',
    });
    expect(document.sections[0].content.title?.en).toBe('Eid offer');
    expect(JSON.stringify(document)).not.toMatch(/\d+%|guaranteed|cheapest/i);
  });

  it('blocks unsafe links and time-limited promotions without dates', () => {
    const document = pageTemplate('promotion', 'template');
    document.sections[0].content.ctaHref = 'javascript:alert(1)';
    document.sections[0].content.body = { en: 'Limited discount offer' };
    const issues = reviews.review(
      document,
      { title: { en: 'Offer' }, description: { en: '' } },
      ['en'],
      'promotion',
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'mustFix', code: 'unsafe-link' }),
        expect.objectContaining({
          severity: 'mustFix',
          code: 'promotion-dates',
        }),
      ]),
    );
  });

  it('warns about untranslated Bangla fields and missing alt text', () => {
    const document = pageTemplate('home', 'template');
    document.sections[0].content.imageUrl =
      '/storefront/assets/public/00000000-0000-0000-0000-000000000000';
    const issues = reviews.review(
      document,
      { title: { en: 'Home' }, description: { en: '' } },
      ['en', 'bn'],
      'home',
    );
    expect(issues.some((issue) => issue.code === 'missing-translation')).toBe(
      true,
    );
    expect(issues.some((issue) => issue.code === 'missing-alt')).toBe(true);
  });
});
