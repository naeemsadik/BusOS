import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class StorefrontRateLimitService {
  private readonly attempts = new Map<string, number[]>();
  check(key: string, limit: number, windowMs = 60_000) {
    const now = Date.now(); const cutoff = now - windowMs;
    if (this.attempts.size > 10_000) {
      for (const [entry, timestamps] of this.attempts) if (!timestamps.some(value => value > cutoff)) this.attempts.delete(entry);
    }
    const timestamps = (this.attempts.get(key) || []).filter(value => value > cutoff);
    if (timestamps.length >= limit) throw new HttpException('Too many requests. Please wait and try again.', HttpStatus.TOO_MANY_REQUESTS);
    timestamps.push(now); this.attempts.set(key, timestamps);
  }
}
