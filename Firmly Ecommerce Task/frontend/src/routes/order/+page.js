import { apiFetch } from '$lib/api/client';

export async function load({ fetch }) {
  try {
    const orders = await apiFetch('https://order-worker.sridhar-89c.workers.dev/orders', { 
      fetch,
      credentials: 'include'
    });
    return { orders };
  } catch (error) {
    return { orders: [], error: error.message };
  }
}