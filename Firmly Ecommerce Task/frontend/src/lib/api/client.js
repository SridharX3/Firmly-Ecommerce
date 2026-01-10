import { AUTH_API, PRODUCTS_API, CART_API, ORDER_API } from './endpoints';

// Define a list of allowed API base URLs to prevent accidental calls to unauthorized endpoints.
const ALLOWED_API_BASE_URLS = [
  AUTH_API,
  PRODUCTS_API,
  CART_API,
  ORDER_API,
];

export async function apiFetch(url, options = {}) {
  // Validate that the requested URL starts with one of the allowed API base URLs.
  // This prevents accidental calls to internal or unauthorized endpoints.
  const isAllowedUrl = ALLOWED_API_BASE_URLS.some(baseUrl => url.startsWith(baseUrl));
  if (!isAllowedUrl) {
    console.error(`Attempted to fetch from an unauthorized URL: ${url}`);
    throw new Error('Unauthorized API endpoint.');
  }

  const {
    method = 'GET',
    headers = {},
    body
  } = options;

  const isFormData = body instanceof FormData;
  const isString = typeof body === 'string';

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers
    },
    body:
      body == null
        ? undefined
        : isFormData || isString
          ? body
          : JSON.stringify(body)
  });

  if (!res.ok) {
    let err;
    try {
      err = await res.json();
    } catch {
      throw new Error(`Request failed (${res.status})`);
    }
    throw new Error(err.error || err.message || 'Request failed');
  }

  if (res.status === 204) return null;

  return res.json();
}
