import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { servicesRoutes } from "./routes/services.js";
import { incidentsRoutes } from "./routes/incidents.js";
import { spansRoutes } from "./routes/spans.js";
import { ingestionRoutes } from "./routes/ingestion.js";
import { liveRoutes } from "./routes/live.js";

const app = Fastify({ logger: true });

app.register(cors, {
  origin: "http://localhost:3000",
});
app.register(websocketPlugin);

app.get("/health", async () => {
  return { status: "ok", service: "api" };
});

app.register(servicesRoutes);
app.register(incidentsRoutes);
app.register(spansRoutes);
app.register(ingestionRoutes);
app.register(liveRoutes);

const start = async () => {
  try {
    await app.listen({ port: 3001, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();