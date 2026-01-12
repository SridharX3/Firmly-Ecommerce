import { a as apiFetch } from "../../../../chunks/client.js";
async function load({ fetch, params }) {
  try {
    const order = await apiFetch(`https://order-worker.sridhar-89c.workers.dev/orders/${params.checkout_id}`, {
      fetch,
      credentials: "include"
    });
    return { order };
  } catch (error) {
    return { order: null, error: error.message };
  }
}
export {
  load
};
