import crypto from 'crypto';
import Redis from "ioredis";
import { FastifyInstance } from 'fastify';
import 'dotenv/config'

interface UrlEntry {
  shortUrl: string;
  longUrl: string;
  createdAt: Date;
  expiresAt?: Date;
  hits: number;
}

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
});

const generateHash = (url: string): string => {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 8); // Using the first 8 characters
};

export const shortenURL = async (url: string): Promise<string> => {
  let hash = generateHash(url);
  let attempt = 0;

  if (!url.match(/^[a-zA-Z]+:\/\//)) {
    url = 'https://' + url;
  }

  let exists = await redisClient.get(hash);
  while (exists) {
    if (exists === url) {
      return hash; // If the same URL is hashed, reuse the hash
    }
    hash = generateHash(url + ++attempt);
    exists = await redisClient.get(hash);
  }

  await redisClient.set(hash, url);
  return hash;
};

export const getUrl = async (shortUrl: string): Promise<string | null> => {
  const url = await redisClient.get(shortUrl);
  return url;
};


interface RequestParams {
  shortUrl: string;
}

export const url = (
  server: FastifyInstance,
  _: unknown,
  done: (err?: Error) => void
) => {
  server.post('/shorten', async (request, reply) => {
    const { url } = request.body as { url: string };
    const shortUrl = await shortenURL(url);
    return { shortUrl: `http://${request.headers.host}/${shortUrl}` };
  });

  server.get('/:shortUrl', async (request, reply) => {
    const { shortUrl } = request.params as RequestParams;
    const url = await getUrl(shortUrl);
    if (url) {
      return reply.redirect(url);
    } else {
      return reply.status(404).send({ error: 'URL not found' });
    }
  });

  done();
};
