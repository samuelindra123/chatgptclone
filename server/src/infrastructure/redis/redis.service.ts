import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { type RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisUrl: string | null;
  private readonly client: Redis | null;
  private redisAvailable: boolean;

  constructor(private readonly configService: ConfigService) {
    this.redisUrl = this.configService.get<string>('REDIS_URL')?.trim() || null;
    this.redisAvailable = Boolean(this.redisUrl);
    this.client = this.redisUrl
      ? new Redis(this.redisUrl, this.buildOptions())
      : null;

    if (this.client) {
      this.attachLifecycleHandlers(this.client, 'primary');
    }

    if (!this.redisUrl) {
      this.logger.log(
        'REDIS_URL is not configured. AI Council streaming will fall back to in-memory mode.',
      );
    }
  }

  isEnabled() {
    return Boolean(this.client) && this.redisAvailable;
  }

  async getClient() {
    if (!this.client) {
      return null;
    }

    if (!this.redisAvailable) {
      return null;
    }

    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }

      return this.client;
    } catch (error) {
      this.markUnavailable(
        `Redis primary connection failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }

  async createSubscriber() {
    if (!this.redisUrl) {
      return null;
    }

    if (!this.redisAvailable) {
      return null;
    }

    const subscriber = new Redis(this.redisUrl, this.buildOptions());
    this.attachLifecycleHandlers(subscriber, 'subscriber');

    try {
      await subscriber.connect();
      return subscriber;
    } catch (error) {
      this.markUnavailable(
        `Redis subscriber connection failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      subscriber.disconnect();
      return null;
    }
  }

  async onModuleDestroy() {
    if (!this.client) {
      return;
    }

    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  private buildOptions(): RedisOptions {
    const shouldUseTls =
      this.redisUrl?.startsWith('rediss://') ||
      this.configService.get<string>('REDIS_TLS') === 'true' ||
      /redislabs\.com|redis-cloud\.com|upstash\.io/i.test(this.redisUrl ?? '');

    return {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      ...(shouldUseTls ? { tls: {} } : {}),
    };
  }

  private attachLifecycleHandlers(client: Redis, label: string) {
    client.on('ready', () => {
      this.redisAvailable = true;
    });

    client.on('error', (error) => {
      this.markUnavailable(
        `Redis ${label} error: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    });

    client.on('close', () => {
      this.markUnavailable(`Redis ${label} connection closed`);
    });
  }

  private markUnavailable(message: string) {
    if (!this.redisAvailable) {
      return;
    }

    this.redisAvailable = false;
    this.logger.warn(`${message}. Falling back to in-memory AI Council stream mode.`);
  }
}
