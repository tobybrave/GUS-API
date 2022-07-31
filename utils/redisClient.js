const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1/6379";

const redisClient = new Redis(redisUrl);

module.exports = redisClient;
