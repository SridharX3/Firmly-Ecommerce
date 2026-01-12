const AUTH_API = "https://auth-worker.sridhar-89c.workers.dev";
const PRODUCTS_API = "https://products-worker.sridhar-89c.workers.dev";
const CART_API = "https://cart-worker.sridhar-89c.workers.dev";
const ORDER_API = "https://order-worker.sridhar-89c.workers.dev";
const ALLOWED_API_BASE_URLS = [
  AUTH_API,
  PRODUCTS_API,
  CART_API,
  ORDER_API
];
async function apiFetch(url, options = {}) {
  const isAllowedUrl = ALLOWED_API_BASE_URLS.some((baseUrl) => url.startsWith(baseUrl));
  if (!isAllowedUrl) {
    console.error(`Attempted to fetch from an unauthorized URL: ${url}`);
    throw new Error("Unauthorized API endpoint.");
  }
  const {
    method = "GET",
    headers = {},
    body
  } = options;
  const isFormData = body instanceof FormData;
  const isString = typeof body === "string";
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      ...isFormData ? {} : { "Content-Type": "application/json" },
      ...headers
    },
    body: body == null ? void 0 : isFormData || isString ? body : JSON.stringify(body)
  });
  if (!res.ok) {
    let err;
    try {
      err = await res.json();
    } catch {
      throw new Error(`Request failed (${res.status})`);
    }
    throw new Error(err.error || err.message || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}
export {
  PRODUCTS_API as P,
  apiFetch as a
};
