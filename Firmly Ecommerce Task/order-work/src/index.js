import router from './router.js';

export default {
  async fetch(req, env, ctx) {
    try {
      return await router.handle(req, env, ctx);
    } catch (err) {
      console.error('ORDER WORKER ERROR:', err);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
};
