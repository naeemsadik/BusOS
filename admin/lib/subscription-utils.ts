import { SubscriptionStatus } from './types'

const STATUS_BADGE_CLASS_MAP: Record<string, string> = {
  [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [SubscriptionStatus.TRIAL]: 'bg-blue-100 text-blue-800',
  [SubscriptionStatus.EXPIRED]: 'bg-red-100 text-red-800',
  [SubscriptionStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
}

const STATUS_DOT_CLASS_MAP: Record<string, string> = {
  [SubscriptionStatus.ACTIVE]: 'bg-green-500',
  [SubscriptionStatus.TRIAL]: 'bg-blue-500',
  [SubscriptionStatus.EXPIRED]: 'bg-red-500',
  [SubscriptionStatus.CANCELLED]: 'bg-gray-500',
}

const DEFAULT_BADGE_CLASS = 'bg-gray-100 text-gray-800'
const DEFAULT_DOT_CLASS = 'bg-gray-500'

export function getSubscriptionStatusBadgeClass(status: string): string {
  const normalizedStatus = status.toLowerCase()
  return STATUS_BADGE_CLASS_MAP[normalizedStatus] || DEFAULT_BADGE_CLASS
}

export function getSubscriptionStatusDotClass(status: string): string {
  const normalizedStatus = status.toLowerCase()
  return STATUS_DOT_CLASS_MAP[normalizedStatus] || DEFAULT_DOT_CLASS
}
