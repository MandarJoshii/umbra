import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { incidents } from "../db/schema.js";

export async function incidentsRoutes(app: FastifyInstance) {
  app.get("/incidents", async () => {
    return db.select().from(incidents);
  });

  app.post<{
    Body: {
      title: string;
      description?: string;
      serviceId?: number;
      severity: string;
      startedAt: string;
    };
  }>("/incidents", async (request, reply) => {
    const { title, description, serviceId, severity, startedAt } = request.body;

    if (!title || !severity || !startedAt) {
      return reply
        .status(400)
        .send({ error: "title, severity, and startedAt are required" });
    }

    const [created] = await db
      .insert(incidents)
      .values({
        title,
        description,
        serviceId,
        severity,
        startedAt: new Date(startedAt),
      })
      .returning();

    return reply.status(201).send(created);
  });
}