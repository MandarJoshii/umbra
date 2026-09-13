import Fastify from "fastify";
import { db } from "./db/index.js";
import { services } from "./db/schema.js";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok", service: "api" };
});

app.get("/services", async () => {
  const allServices = await db.select().from(services);
  return allServices;
});

app.post<{ Body: { name: string } }>("/services", async (request, reply) => {
  const { name } = request.body;

  if (!name) {
    return reply.status(400).send({ error: "name is required" });
  }

  const [created] = await db.insert(services).values({ name }).returning();
  return reply.status(201).send(created);
});

const start = async () => {
  try {
    await app.listen({ port: 3001, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();