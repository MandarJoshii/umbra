import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { services } from "../db/schema.js";

export async function servicesRoutes(app: FastifyInstance) {
  app.get("/services", async () => {
    return db.select().from(services);
  });

  app.post<{ Body: { name: string } }>("/services", async (request, reply) => {
    const { name } = request.body;

    if (!name) {
      return reply.status(400).send({ error: "name is required" });
    }

    const [created] = await db.insert(services).values({ name }).returning();
    return reply.status(201).send(created);
  });
}