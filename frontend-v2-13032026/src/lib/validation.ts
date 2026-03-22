import type { CreateMarketRequest } from '@/lib/api/types/admin';
import { MARKET_CREATION_LIMITS } from '@/lib/api/types/admin';

export interface ValidationError {
  field: keyof CreateMarketRequest;
  message: string;
}

export function validateMarketCreation(data: CreateMarketRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate question
  if (!data.question || data.question.trim() === '') {
    errors.push({ field: 'question', message: 'Question is required' });
  } else if (data.question.length < MARKET_CREATION_LIMITS.QUESTION_MIN_LENGTH) {
    errors.push({ 
      field: 'question', 
      message: `Question must be at least ${MARKET_CREATION_LIMITS.QUESTION_MIN_LENGTH} characters` 
    });
  } else if (data.question.length > MARKET_CREATION_LIMITS.QUESTION_MAX_LENGTH) {
    errors.push({ 
      field: 'question', 
      message: `Question must be no more than ${MARKET_CREATION_LIMITS.QUESTION_MAX_LENGTH} characters` 
    });
  }

  // Validate description (optional)
  if (data.description && data.description.length > MARKET_CREATION_LIMITS.DESCRIPTION_MAX_LENGTH) {
    errors.push({ 
      field: 'description', 
      message: `Description must be no more than ${MARKET_CREATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters` 
    });
  }

  // Validate closing date
  if (!data.closes_at) {
    errors.push({ field: 'closes_at', message: 'Closing date is required' });
  } else {
    const closingDate = new Date(data.closes_at);
    const now = new Date();
    if (isNaN(closingDate.getTime())) {
      errors.push({ field: 'closes_at', message: 'Invalid date format' });
    } else if (closingDate <= now) {
      errors.push({ field: 'closes_at', message: 'Closing date must be in the future' });
    }
  }

  // Validate liquidity parameter
  if (typeof data.liquidity_param !== 'number' || data.liquidity_param < MARKET_CREATION_LIMITS.LIQUIDITY_PARAM_MIN) {
    errors.push({ 
      field: 'liquidity_param', 
      message: `Liquidity parameter must be at least ${MARKET_CREATION_LIMITS.LIQUIDITY_PARAM_MIN}` 
    });
  }

  return errors;
}

export function formatLiquidityParam(value: number): string {
  return value.toLocaleString();
}

export function parseLiquidityParam(value: string): number {
  const parsed = parseInt(value.replace(/,/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
}
