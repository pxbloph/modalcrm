import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
    private readonly store = new Map<string, { data: any; expiresAt: number }>();

    constructor() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.store.entries()) {
                if (now > entry.expiresAt) this.store.delete(key);
            }
        }, 120_000);
    }

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
        return entry.data as T;
    }

    set(key: string, data: any, ttlMs: number): void {
        this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
    }

    invalidate(prefix: string): void {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) this.store.delete(key);
        }
    }
}
