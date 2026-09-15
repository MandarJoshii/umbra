import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { spans } from "../db/schema.js";

export async function spansRoutes(app: FastifyInstance) {
  app.get("/spans", async () => {
    return db.select().from(spans);
  });

  app.post<{
    Body: {
      traceId: string;
      spanId: string;
      parentSpanId?: string;
      serviceId: number;
      name: string;
      startTime: string;
      durationMs: number;
      statusCode?: number;
      attributes?: Record<string, unknown>;
    };
  }>("/spans", async (request, reply) => {
    const body = request.body;

    if (!body.traceId || !body.spanId || !body.serviceId || !body.name) {
      return reply
        .status(400)
        .send({ error: "traceId, spanId, serviceId, and name are required" });
    }

    const [created] = await db
      .insert(spans)
      .values({
        ...body,
        startTime: new Date(body.startTime),
      })
      .returning();

    return reply.status(201).send(created);
  });
}