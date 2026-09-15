import type { FastifyInstance } from "fastify";
import { Redis } from "ioredis";

const SPAN_EVENTS_CHANNEL = "umbra:spans:events";

export async function liveRoutes(app: FastifyInstance) {
  // Track all currently-connected WebSocket clients
  const clients = new Set<WebSocket>();

  // A dedicated Redis connection just for subscribing.
  // ioredis requires a separate connection for pub/sub mode —
  // a subscriber connection can't also run normal commands.
  const subscriber = new Redis(process.env.REDIS_URL!);
  await subscriber.subscribe(SPAN_EVENTS_CHANNEL);

  subscriber.on("message", (channel, message) => {
    if (channel !== SPAN_EVENTS_CHANNEL) return;

    // Broadcast the event to every connected WebSocket client
    for (const client of clients) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  });

  app.get("/ws/live", { websocket: true }, (socket) => {
    clients.add(socket);
    app.log.info(`WebSocket client connected. Total clients: ${clients.size}`);

    socket.on("close", () => {
      clients.delete(socket);
      app.log.info(`WebSocket client disconnected. Total clients: ${clients.size}`);
    });
  });
}