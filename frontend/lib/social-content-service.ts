import { api } from './api'

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'x'
export type SocialGoal =
  | 'product'
  | 'promotion'
  | 'awareness'
  | 'educational'
  | 'seasonal'
export type SocialTone =
  | 'friendly'
  | 'professional'
  | 'premium'
  | 'urgent'
  | 'playful'
export type SocialLanguage = 'english' | 'bangla'
export type SocialAspectRatio = '1:1' | '4:5' | '9:16' | '16:9'

export interface GenerateSocialContentData {
  platform: SocialPlatform
  goal: SocialGoal
  topic: string
  offer?: string
  audience?: string
  visualDirection?: string
  tone: SocialTone
  language: SocialLanguage
  aspectRatio: SocialAspectRatio
  generateImage: boolean
}

export interface GeneratedSocialContent {
  headline: string
  caption: string
  callToAction: string
  hashtags: string[]
  imagePrompt: string
  platform: SocialPlatform
  aspectRatio: SocialAspectRatio
  image?: {
    data: string
    mimeType: string
  }
  imageError?: string
}

class SocialContentService {
  async generate(
    data: GenerateSocialContentData,
  ): Promise<GeneratedSocialContent> {
    const response = await api.post('/content-studio/generate', data)
    return response.data
  }
}

export const socialContentService = new SocialContentService()
