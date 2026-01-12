import { a as apiFetch, P as PRODUCTS_API } from "../../../../chunks/client.js";
const ssr = false;
async function load({ params }) {
  const product = await apiFetch(`${PRODUCTS_API}/products/${params.id}`);
  return { product };
}
export {
  load,
  ssr
};
