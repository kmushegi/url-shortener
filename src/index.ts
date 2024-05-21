// import "@sentry/tracing";
import * as Sentry from "@sentry/node";
import fastify from "fastify";
import { url } from "./routes/url";
import 'dotenv/config'


Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

const server = fastify({ logger: true });

const start = async () => {
  try {
    server.get("/health", async (_, reply) => {
      return reply.status(200).send();
    });
    // server.register(require('@fastify/redis'), { redisClient })
    server.register(url);
    server.listen(
      { port: 9090, host: "0.0.0.0" },
      (err: any, address: string) => {
        if (err) {
          throw new Error();
        }
        console.log(`Server listening at ${address}`);
      }
    );
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    process.exit(1);
  }
};

start();
