import Fastify from "fastify";
import { servicesRoutes } from "./routes/services.js";
import { incidentsRoutes } from "./routes/incidents.js";
import { spansRoutes } from "./routes/spans.js";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok", service: "api" };
});

app.register(servicesRoutes);
app.register(incidentsRoutes);
app.register(spansRoutes);

const start = async () => {
  try {
    await app.listen({ port: 3001, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();