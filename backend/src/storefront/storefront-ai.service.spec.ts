import { ServiceUnavailableException } from '@nestjs/common';
import { StorefrontAiService } from './storefront-ai.service';

describe('StorefrontAiService provider safety', () => {
  const configValues: Record<string, string> = {
    AI_API_KEY: 'mock-key',
    CMS_AI_ENABLED: 'true',
    CMS_AI_ORG_MONTHLY_LIMIT: '10',
    CMS_AI_USER_MONTHLY_LIMIT: '10',
    CMS_AI_TIMEOUT_MS: '5',
  };
  const config = {
    get: jest.fn((key: string) => configValues[key]),
  };
  const suggestions = {
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'suggestion-id', ...value })),
  };
  const sites = {
    findOne: jest.fn().mockResolvedValue({ aiEnabled: true }),
  };
  const service = new StorefrontAiService(
    config as any,
    {} as any,
    { check: jest.fn() } as any,
    suggestions as any,
    {} as any,
    {} as any,
    sites as any,
  );

  beforeEach(() => {
    jest.restoreAllMocks();
    suggestions.count.mockReset().mockResolvedValue(0);
    suggestions.save.mockClear();
    sites.findOne.mockClear();
  });

  it('uses a deterministic fallback when the mocked provider times out', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('mock timeout'));

    const result = await (service as any).tryGenerate(
      'prompt',
      { type: 'object' },
      'outline',
      'organization-id',
      'user-id',
    );

    expect(result.aiGenerated).toBe(false);
    expect(result.fallbackReason).toContain('deterministic fallback');
    expect(suggestions.save).toHaveBeenCalledWith(
      expect.objectContaining({ failureCode: 'provider-error' }),
    );
  });

  it('rejects malformed provider JSON and uses the fallback', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: '{not-json' }],
          },
        ],
      }),
    } as any);

    const result = await (service as any).tryGenerate(
      'prompt',
      { type: 'object' },
      'outline',
      'organization-id',
      'user-id',
    );

    expect(result.aiGenerated).toBe(false);
    expect(result.value).toBeUndefined();
  });

  it('rejects invented protected numbers', () => {
    const context = {
      products: [],
      categories: [],
      facts: {},
    };

    expect((service as any).isFactSafe('Delivery takes 999 days', context)).toBe(
      false,
    );
    expect(
      (service as any).isFactSafe(
        'Call 01710000001',
        context,
        'Call 01710000001',
      ),
    ).toBe(true);
  });

  it('blocks requests when the mocked monthly organization quota is exhausted', async () => {
    configValues.CMS_AI_ORG_MONTHLY_LIMIT = '1';
    suggestions.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(
      (service as any).limit('organization-id', 'user-id'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    configValues.CMS_AI_ORG_MONTHLY_LIMIT = '10';
  });
});
