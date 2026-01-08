// src/utils/logger.js
import { trace } from '@opentelemetry/api';

export function log(level, message, extra = {}) {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId;

  console.log(
    JSON.stringify({
      level,
      message,
      trace_id: traceId,
      ...extra
    })
  );
}
