import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Organization } from '../entities';
import { GenerateSocialContentDto } from './dto/generate-social-content.dto';

interface AIResponse {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
}

interface AIImageResponse {
  data?: Array<{ b64_json?: string }>;
}

interface GeneratedCopy {
  headline: string;
  caption: string;
  callToAction: string;
  hashtags: string[];
  imagePrompt: string;
}

@Injectable()
export class SocialContentService {
  private readonly logger = new Logger(SocialContentService.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(dto: GenerateSocialContentDto, organization: Organization) {
    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        headline: { type: 'string' },
        caption: { type: 'string' },
        callToAction: { type: 'string' },
        hashtags: {
          type: 'array',
          minItems: 3,
          maxItems: 12,
          items: { type: 'string' },
        },
        imagePrompt: { type: 'string' },
      },
      required: [
        'headline',
        'caption',
        'callToAction',
        'hashtags',
        'imagePrompt',
      ],
    };
    const textPrompt = [
      `Create a ${dto.platform} social post for ${organization.name}.`,
      `Campaign goal: ${dto.goal}.`,
      `Topic or product: ${dto.topic}.`,
      `Offer: ${dto.offer || 'No offer was provided.'}`,
      `Audience: ${dto.audience || 'General retail customers.'}`,
      `Tone: ${dto.tone}. Language: ${dto.language}.`,
      `Visual direction: ${dto.visualDirection || 'Clean retail product photography with a confident, practical composition.'}`,
      'Do not invent prices, discounts, guarantees, stock levels, or product claims.',
      'Do not use emoji characters.',
      'Make the caption appropriate for the selected platform and keep the headline concise.',
      'Hashtags must start with # and must not contain spaces.',
      'The image prompt should describe one polished social media visual and include the exact short headline as readable text.',
    ].join('\n');

    const copy = await this.requestStructuredOutput(textPrompt, schema);
    const normalizedCopy: GeneratedCopy = {
      headline: this.requiredString(copy.headline, 'Social post'),
      caption: this.requiredString(copy.caption, ''),
      callToAction: this.requiredString(copy.callToAction, ''),
      hashtags: Array.isArray(copy.hashtags)
        ? copy.hashtags
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 12)
        : [],
      imagePrompt: this.requiredString(
        copy.imagePrompt,
        `Create a polished retail social media image about ${dto.topic}.`,
      ),
    };

    let image: { data: string; mimeType: string } | undefined;
    let imageError: string | undefined;
    if (dto.generateImage) {
      try {
        image = await this.requestImage(
          [
            normalizedCopy.imagePrompt,
            `Brand: ${organization.name}.`,
            `Use a ${dto.aspectRatio} composition for ${dto.platform}.`,
            'Do not include emoji characters, third-party logos, watermarks, QR codes, or fabricated prices.',
          ].join('\n'),
          dto.aspectRatio,
        );
      } catch (error) {
        imageError = this.publicErrorMessage(
          error,
          'The campaign copy was generated, but the image service is temporarily unavailable.',
        );
        this.logger.warn(`Campaign image was skipped: ${imageError}`);
      }
    }

    return {
      ...normalizedCopy,
      platform: dto.platform,
      aspectRatio: dto.aspectRatio,
      image,
      imageError,
    };
  }

  private async requestStructuredOutput(prompt: string, schema: object) {
    const response = await this.requestAI<AIResponse>('responses', {
      model: 'gpt-5.6-luna',
      input: [{ role: 'user', content: prompt }],
      reasoning: { effort: 'low' },
      text: {
        format: {
          type: 'json_schema',
          name: 'social_content',
          strict: true,
          schema,
        },
      },
      max_output_tokens: 1_500,
      store: false,
    });
    const messageContent = response.output
      ?.filter((item) => item.type === 'message')
      .flatMap((item) => item.content || []);
    const refusal = messageContent?.find(
      (content) => content.type === 'refusal',
    )?.refusal;
    if (refusal) {
      throw new BadGatewayException(
        'AI could not generate this campaign safely. Revise the campaign brief and try again.',
      );
    }
    const outputText = messageContent?.find(
      (content) => content.type === 'output_text',
    )?.text;

    if (!outputText) {
      throw new BadGatewayException('AI returned an empty text response');
    }
    try {
      return JSON.parse(outputText);
    } catch {
      throw new BadGatewayException('AI returned invalid social content');
    }
  }

  private async requestImage(prompt: string, aspectRatio: string) {
    const sizes: Record<string, string> = {
      '1:1': '1024x1024',
      '4:5': '1024x1280',
      '9:16': '1024x1792',
      '16:9': '1792x1024',
    };
    const response = await this.requestAI<AIImageResponse>(
      'images/generations',
      {
        model: 'gpt-image-2',
        prompt,
        size: sizes[aspectRatio] || '1024x1024',
        quality: 'medium',
      },
      150_000,
    );
    const image = response.data?.[0]?.b64_json;

    if (!image) {
      throw new BadGatewayException('AI did not return an image');
    }
    return {
      data: image,
      mimeType: 'image/png',
    };
  }

  private async requestAI<T>(
    path: string,
    payload: Record<string, unknown>,
    timeout = 45_000,
  ): Promise<T> {
    const apiKey = this.configService.get<string>('AI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'AI content features are not configured. Add AI_API_KEY to the backend environment, then restart the backend.',
      );
    }

    let response: Response;
    try {
      response = await fetch(
        `https://api.openai.com/v1/${path}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeout),
        },
      );
    } catch (error) {
      this.logger.error(
        `AI provider request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException('AI is temporarily unavailable');
    }

    if (!response.ok) {
      const providerError = (await response.json().catch(() => ({}))) as {
        error?: {
          code?: string;
          message?: string;
          type?: string;
          moderation_details?: unknown;
        };
      };
      const errorCode = providerError.error?.code || providerError.error?.type;
      if (response.status === 401) {
        this.logger.error(
          `AI provider authentication was rejected with status ${response.status}`,
        );
        throw new ServiceUnavailableException(
          'AI authentication failed. Replace AI_API_KEY with an active key, then restart the backend.',
        );
      }
      if (response.status === 403) {
        this.logger.error('AI provider denied access to the requested feature');
        throw new ServiceUnavailableException(
          path === 'images/generations'
            ? 'Image generation is not enabled for the configured AI account.'
            : 'The configured AI account does not have permission to use this feature.',
        );
      }
      if (response.status === 429) {
        this.logger.warn('AI provider quota or rate limit was exceeded');
        throw new ServiceUnavailableException(
          'AI usage is temporarily unavailable because the quota or rate limit was reached.',
        );
      }
      if (response.status === 404) {
        this.logger.error('The configured AI model is not available');
        throw new ServiceUnavailableException(
          'The configured AI model is unavailable. Contact the application administrator.',
        );
      }
      if (errorCode === 'moderation_blocked') {
        this.logger.warn('AI provider blocked a social image request during moderation');
        throw new BadGatewayException(
          'AI could not generate this image safely. Revise the visual direction and try again.',
        );
      }
      this.logger.error(
        `AI provider returned status ${response.status}${errorCode ? ` (${errorCode})` : ''}`,
      );
      throw new BadGatewayException(
        'AI could not generate this content. Check the configuration and try again.',
      );
    }

    return (await response.json()) as T;
  }

  private requiredString(value: unknown, fallback: string) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private publicErrorMessage(error: unknown, fallback: string) {
    if (
      error &&
      typeof error === 'object' &&
      'getResponse' in error &&
      typeof error.getResponse === 'function'
    ) {
      const response = error.getResponse() as
        | string
        | { message?: string | string[] };
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response.message === 'string') {
        return response.message;
      }
      if (Array.isArray(response.message)) {
        return response.message.join(' ');
      }
    }
    return fallback;
  }
}
