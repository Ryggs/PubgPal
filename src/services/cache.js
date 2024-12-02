class Cache {
    constructor() {
        this.cache = new Map();
        this.TTL = 5 * 60 * 1000; // 5 minutes default TTL
    }

    set(key, value, ttl = this.TTL) {
        const item = {
            value,
            expiry: Date.now() + ttl
        };
        this.cache.set(key, item);
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    // Clean expired entries periodically
    startCleanup(interval = 15 * 60 * 1000) { // 15 minutes
        setInterval(() => {
            const now = Date.now();
            for (const [key, item] of this.cache.entries()) {
                if (now > item.expiry) {
                    this.cache.delete(key);
                }
            }
        }, interval);
    }
}

module.exports = new Cache();