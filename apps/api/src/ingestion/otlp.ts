// Minimal types for the parts of the OTLP JSON payload we actually use.
// The real spec has many more optional fields — we only model what we read.
interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes?: { key: string; value: Record<string, unknown> }[];
  status?: { code?: number };
}

interface OtlpResourceSpans {
  resource?: {
    attributes?: { key: string; value: Record<string, unknown> }[];
  };
  scopeSpans?: {
    spans?: OtlpSpan[];
  }[];
}

export interface OtlpPayload {
  resourceSpans?: OtlpResourceSpans[];
}

// Our internal, simplified shape — matches the spans table (minus id/createdAt)
export interface NormalizedSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  serviceName: string;
  name: string;
  startTime: Date;
  durationMs: number;
  statusCode: number | null;
  attributes: Record<string, unknown>;
}

function nanoToDate(unixNano: string): Date {
  // OTLP timestamps are nanoseconds since epoch, as a string (too big for a JS number).
  // Divide by 1_000_000 to get milliseconds, which Date() expects.
  return new Date(Number(BigInt(unixNano) / 1_000_000n));
}

function getServiceName(resource?: OtlpResourceSpans["resource"]): string {
  const attr = resource?.attributes?.find((a) => a.key === "service.name");
  return (attr?.value?.stringValue as string) ?? "unknown-service";
}

function flattenAttributes(
  attrs?: { key: string; value: Record<string, unknown> }[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const attr of attrs ?? []) {
    const value = attr.value;
    result[attr.key] =
      value.stringValue ?? value.intValue ?? value.boolValue ?? value.doubleValue ?? null;
  }
  return result;
}

// The main conversion function: OTLP's nested shape -> our flat NormalizedSpan[]
export function normalizeOtlpPayload(payload: OtlpPayload): NormalizedSpan[] {
  const spans: NormalizedSpan[] = [];

  for (const resourceSpan of payload.resourceSpans ?? []) {
    const serviceName = getServiceName(resourceSpan.resource);

    for (const scopeSpan of resourceSpan.scopeSpans ?? []) {
      for (const span of scopeSpan.spans ?? []) {
        const startTime = nanoToDate(span.startTimeUnixNano);
        const endTime = nanoToDate(span.endTimeUnixNano);

        spans.push({
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId ?? null,
          serviceName,
          name: span.name,
          startTime,
          durationMs: endTime.getTime() - startTime.getTime(),
          statusCode: span.status?.code ?? null,
          attributes: flattenAttributes(span.attributes),
        });
      }
    }
  }

  return spans;
}