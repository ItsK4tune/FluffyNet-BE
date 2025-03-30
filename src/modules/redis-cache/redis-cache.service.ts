import { Injectable, Logger } from "@nestjs/common";
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
    } else {
      await this.redis.set(key, JSON.stringify(value));
    }
  }

  async hget(hash: string, field: string): Promise<string | null> {
    return this.redis.hget(hash, field);
  }

  async hgetall(hash: string): Promise<Record<string, any>> {
    const data = await this.redis.hgetall(hash);
    return Object.keys(data).length ? data : null;
  }

  async hset(hash: string, field: string, value: any): Promise<void> {
    await this.redis.hset(hash, field, JSON.stringify(value));
  }

  async hsetall(hash: string, data: Record<string, any>): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const [key, value] of Object.entries(data)) {
      pipeline.hset(hash, key, JSON.stringify(value));
    }

    await pipeline.exec();
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async hdel(hash: string, field: string): Promise<void> {
    await this.redis.hdel(hash, field);
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl);
  }

  async sadd(key: string, data: string) {
    await this.redis.sadd(key, data);
  }

  async scheck(key: string, data: string) {
    this.logger.log(`Redis authenticated with key:${key}`);
    return await this.redis.sismember(key, data);
  }

  async sgetall(key: string) {
    return await this.redis.smembers(key);
  }
}
