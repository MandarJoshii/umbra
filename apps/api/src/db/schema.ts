import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  real,
  vector,
} from "drizzle-orm/pg-core";

// A monitored service — a node in the 3D topology graph
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One unit of work in a request's journey (an HTTP call, a DB query, etc.)
// Multiple spans sharing a traceId together form one full request's path
export const spans = pgTable("spans", {
  id: serial("id").primaryKey(),
  traceId: text("trace_id").notNull(),
  spanId: text("span_id").notNull(),
  parentSpanId: text("parent_span_id"),
  serviceId: integer("service_id")
    .notNull()
    .references(() => services.id),
  name: text("name").notNull(),
  startTime: timestamp("start_time").notNull(),
  durationMs: real("duration_ms").notNull(),
  statusCode: integer("status_code"),
  attributes: jsonb("attributes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A recorded incident — something that went wrong
export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  serviceId: integer("service_id").references(() => services.id),
  severity: text("severity").notNull(), // "low" | "medium" | "high" | "critical"
  status: text("status").notNull().default("open"), // "open" | "resolved"
  startedAt: timestamp("started_at").notNull(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A runbook document, with a vector embedding for semantic search
export const runbooks = pgTable("runbooks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 384 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});