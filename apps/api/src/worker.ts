import { redis } from "./redis.js";
import { db } from "./db/index.js";
import { services, spans } from "./db/schema.js";
import { eq } from "drizzle-orm";

const SPAN_QUEUE_KEY = "umbra:spans:queue";
const BATCH_SIZE = 50;
const POLL_INTERVAL_MS = 1000;

// Cache of serviceName -> serviceId, so we don't hit the DB for every single span
const serviceIdCache = new Map<string, number>();

async function getOrCreateServiceId(serviceName: string): Promise<number> {
  if (serviceIdCache.has(serviceName)) {
    return serviceIdCache.get(serviceName)!;
  }

  const existing = await db
    .select()
    .from(services)
    .where(eq(services.name, serviceName));

  if (existing.length > 0) {
    serviceIdCache.set(serviceName, existing[0].id);
    return existing[0].id;
  }

  const [created] = await db.insert(services).values({ name: serviceName }).returning();
  serviceIdCache.set(serviceName, created.id);
  return created.id;
}

async function processBatch() {
  const rawItems = await redis.lpop(SPAN_QUEUE_KEY, BATCH_SIZE);

  if (!rawItems || rawItems.length === 0) {
    return;
  }

  const rows = [];

  for (const raw of rawItems) {
    const span = JSON.parse(raw);
    const serviceId = await getOrCreateServiceId(span.serviceName);

    rows.push({
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      serviceId,
      name: span.name,
      startTime: new Date(span.startTime),
      durationMs: span.durationMs,
      statusCode: span.statusCode,
      attributes: span.attributes,
    });
  }

  await db.insert(spans).values(rows);
  console.log(`Wrote ${rows.length} span(s) to Postgres`);

  // Notify any subscribed WebSocket clients that new spans just landed
  await redis.publish(
    "umbra:spans:events",
    JSON.stringify({ type: "spans.created", count: rows.length })
  );
}

async function startWorker() {
  console.log("Ingestion worker started, polling Redis queue...");

  while (true) {
    try {
      await processBatch();
    } catch (err) {
      console.error("Error processing batch:", err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

startWorker();