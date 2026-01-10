import { apiFetch } from '$lib/api/client';
import { PRODUCTS_API } from '$lib/api/endpoints';

export const ssr = false;

export async function load({ params }) {
  const product = await apiFetch(`${PRODUCTS_API}/products/${params.id}`);
  return { product };
}
