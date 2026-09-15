import type { FastifyInstance } from "fastify";
import { redis } from "../redis.js";
import { normalizeOtlpPayload, type OtlpPayload } from "../ingestion/otlp.js";

const SPAN_QUEUE_KEY = "umbra:spans:queue";

export async function ingestionRoutes(app: FastifyInstance) {
  app.post<{ Body: OtlpPayload }>("/v1/traces", async (request, reply) => {
    const spans = normalizeOtlpPayload(request.body);

    if (spans.length === 0) {
      return reply.status(400).send({ error: "no spans found in payload" });
    }

    const pipeline = redis.pipeline();
    for (const span of spans) {
      pipeline.rpush(SPAN_QUEUE_KEY, JSON.stringify(span));
    }
    await pipeline.exec();

    app.log.info(`Queued ${spans.length} span(s) for ingestion`);

    return reply.status(202).send({ accepted: spans.length });
  });
}