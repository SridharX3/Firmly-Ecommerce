import router from './router.js';
import { json } from './response.js';

export default {
  async fetch(request, env, ctx) {
    try {
      return await router.handle(request, env, ctx);
    } catch (err) {
      console.error('CRITICAL WORKER ERROR:', err);
      return json(err, 500, request);
    }
  }
};
