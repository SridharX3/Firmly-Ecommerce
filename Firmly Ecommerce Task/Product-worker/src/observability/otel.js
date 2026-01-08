// src/observability/otel.js
export function startSpan(ctx, name, attributes = {}) {
  if (!ctx?.tracing) {
    return {
      setAttribute() {},
      recordException() {},
      end() {}
    };
  }

  let span;

  ctx.tracing.startSpan(name, (s) => {
    span = s;
    for (const [key, value] of Object.entries(attributes)) {
      s.setAttribute(key, value);
    }
  });

  return {
    setAttribute(key, value) {
      span?.setAttribute(key, value);
    },
    recordException(err) {
      span?.recordException(err);
    },
    end(extraAttrs = {}) {
      if (!span) return;
      for (const [key, value] of Object.entries(extraAttrs)) {
        span.setAttribute(key, value);
      }
      span.end();
    }
  };
}
export function withSpan(ctx, name, attributes, fn) {
  if (!ctx?.tracing?.startSpan) {
    // tracing disabled → just run function
    return fn({ setAttribute() {}, recordException() {} });
  }
  return ctx.tracing.startSpan(name, attributes, fn);
}