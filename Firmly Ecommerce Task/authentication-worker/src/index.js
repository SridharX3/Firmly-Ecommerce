import router from './router.js';
import { json } from './response.js';
import { withSpan } from './observability/otel.js';

export default {
  async fetch(request, env, ctx) {
    return withSpan(
      ctx,
      'http.request',
      {
        'http.method': request.method,
        'http.url': request.url
      },
      async (span) => {
        try {
          const response = await router.handle(request, env, ctx);

          if (!(response instanceof Response)) {
            span.setAttribute('http.status_code', 500);
            return json({ error: 'Invalid response' }, 500);
          }

          span.setAttribute('http.status_code', response.status);
          return response;
        } catch (err) {
          span.recordException(err);
          return json(
            { error: 'Internal Server Error', message: err.message },
            500
          );
        }
      }
    );
  }
};
