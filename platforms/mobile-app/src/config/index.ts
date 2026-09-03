/**
 * App configuration - API base URL and constants
 */

export const API_BASE_URL = 'https://portal.kadr.live/api';

export const APP_NAME = 'Kadr';

export const USER_TYPES = {
  ADMIN: 'ADMIN',
  MEDIATOR: 'MEDIATOR',
  CLIENT: 'CLIENT',
} as const;

export const SUBSCRIPTION_TIERS = {
  FREE: 'FREE',
  PRO: 'PRO',
} as const;

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];
export type SubscriptionTier =
  (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS];
