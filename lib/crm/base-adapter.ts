import type {
  CrmContact, CrmDeal, CrmCallLog, CrmAppointment,
  CrmResult, CrmConnectionStatus, CrmProvider, CrmOAuthTokens
} from '@/types/crm';
import type { ICrmAdapter } from './adapter';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private maxTokens: number, private refillIntervalMs: number) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed >= this.refillIntervalMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
    if (this.tokens <= 0) {
      const waitTime = this.refillIntervalMs - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.tokens = this.maxTokens;
      this.lastRefill = Date.now();
    }
    this.tokens--;
  }
}

interface RetryableError extends Error {
  status?: number;
  statusCode?: number;
  response?: { status?: number };
}

function getStatusCode(error: RetryableError): number | undefined {
  return error.status ?? error.statusCode ?? error.response?.status;
}

export abstract class BaseCrmAdapter implements ICrmAdapter {
  abstract readonly provider: CrmProvider;
  protected tokens: CrmOAuthTokens | null = null;
  private rateLimiter: TokenBucket;

  constructor(config: { maxRequestsPerWindow: number; windowMs: number }) {
    this.rateLimiter = new TokenBucket(config.maxRequestsPerWindow, config.windowMs);
  }

  // Abstract methods that subclasses implement
  abstract createContact(data: CrmContact): Promise<CrmResult>;
  abstract createDeal(data: CrmDeal): Promise<CrmResult>;
  abstract logCall(data: CrmCallLog): Promise<CrmResult>;
  abstract bookAppointment(data: CrmAppointment): Promise<CrmResult>;
  abstract getConnectionStatus(): Promise<CrmConnectionStatus>;
  abstract disconnect(): Promise<void>;
  abstract getAuthorizationUrl(redirectUri: string, state: string): string;
  abstract handleOAuthCallback(code: string, redirectUri: string): Promise<CrmOAuthTokens>;
  abstract refreshTokens(tokens: CrmOAuthTokens): Promise<CrmOAuthTokens>;

  /**
   * Checks if the current token is about to expire (within 60s buffer)
   * and refreshes it if needed. Returns the valid access token string.
   */
  protected async ensureValidToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error(`No tokens set for ${this.provider} adapter`);
    }

    const now = Date.now();
    const expiresAt = this.tokens.expiresAt;

    if (expiresAt - now < TOKEN_EXPIRY_BUFFER_MS) {
      this.tokens = await this.refreshTokens(this.tokens);
    }

    return this.tokens.accessToken;
  }

  /**
   * Wraps any async operation with rate limiting, retry with exponential
   * backoff, and error handling. On unrecoverable failure, returns a
   * CrmResult with success: false.
   */
  protected async makeRequest<T>(fn: () => Promise<T>): Promise<T> {
    await this.rateLimiter.acquire();

    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;

        const statusCode = getStatusCode(error as RetryableError);
        const isRetryable = statusCode !== undefined && RETRYABLE_STATUS_CODES.has(statusCode);

        if (!isRetryable || attempt === MAX_RETRIES - 1) {
          throw error;
        }

        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Sets OAuth tokens on this adapter instance.
   */
  setTokens(tokens: CrmOAuthTokens): void {
    this.tokens = tokens;
  }
}
