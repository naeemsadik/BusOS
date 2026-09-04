import { api } from './api'
import type { CreateProductData } from './inventory-service'

export interface InventoryVoiceResult {
  mode: 'inventory'
  action: 'create_product' | 'unknown'
  transcript: string
  product: Partial<CreateProductData>
  missingFields: string[]
  summary: string
}

export interface PosVoiceItem {
  requestedName: string
  quantity: number
  matched: boolean
  productId?: string
  productName?: string
  price?: number
  availableStock?: number
}

export interface PosVoiceResult {
  mode: 'pos'
  action: 'prepare_invoice' | 'update_cart' | 'unknown'
  transcript: string
  items: PosVoiceItem[]
  paymentMethod?: 'cash' | 'card' | 'mobile' | 'cod'
  deliveryType?: 'pickup' | 'delivery'
  customerName?: string
  customerPhone?: string
  generateInvoice: boolean
  summary: string
}

export interface AssistantVoiceResult {
  mode: 'assistant'
  action: 'answer'
  intent: string
  period: string
  answer: string
  metrics: Array<{ label: string; value: string }>
  items: Array<{ label: string; value: string }>
}

export type VoiceCommandResult =
  | InventoryVoiceResult
  | PosVoiceResult
  | AssistantVoiceResult

class VoiceService {
  async interpret(
    mode: 'inventory',
    transcript: string,
  ): Promise<InventoryVoiceResult>
  async interpret(mode: 'pos', transcript: string): Promise<PosVoiceResult>
  async interpret(
    mode: 'assistant',
    transcript: string,
  ): Promise<AssistantVoiceResult>
  async interpret(
    mode: 'inventory' | 'pos' | 'assistant',
    transcript: string,
  ): Promise<VoiceCommandResult> {
    const endpoint = mode === 'assistant' ? '/voice/assistant' : '/voice/interpret'
    const response = await api.post(endpoint, { mode, transcript })
    return response.data
  }

  async speak(text: string, language: 'en-US' | 'bn-BD'): Promise<Blob> {
    const response = await api.post(
      '/voice/speak',
      { text, language },
      { responseType: 'blob' },
    )
    return response.data
  }
}

export const voiceService = new VoiceService()
