import { apiFetch } from '$lib/api/client';

export async function load({ fetch, params }) {
  try {
    const order = await apiFetch(`https://order-worker.sridhar-89c.workers.dev/orders/${params.checkout_id}`, { fetch });
    return { order };
  } catch (error) {
    return { order: null, error: error.message };
  }
}
