import router from './router';
import { json } from './response';

export default {
  async fetch(request, env, ctx) {
    try {
      // Handle the request through the router
      return await router.handle(request, env, ctx);
    } catch (err) {
      console.error('CRITICAL WORKER ERROR:', err);
      return json(err, 500, request);
    }
  }
};
