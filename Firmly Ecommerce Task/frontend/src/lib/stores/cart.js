import { writable, get } from 'svelte/store';
import { apiFetch } from '$lib/api/client';
import { CART_API } from '$lib/api/endpoints';

export const cart = writable({
  items: [],
  subtotal: 0,
  currency: 'USD',
  loading: false,
  error: null
});

export async function loadCart() {
  cart.update(c => ({ ...c, loading: true, error: null }));

  try {
    const data = await apiFetch(`${CART_API}/cart`, { credentials: 'include' });
    
    if (data.error) {
      throw new Error(data.error);
    }

    cart.set({
      items: data.items ?? [],
      subtotal: data.subtotal ?? 0,
      currency: data.currency ?? 'USD',
      loading: false,
      error: null
    });
  } catch (err) {
    cart.update(c => ({ ...c, loading: false, error: err.message }));
  }
}

export async function addToCart(productId, qty = 1) {
  const items = get(cart).items;
  const existing = items.find(i => i.product_id === productId);

  if (existing) {
    return updateQuantity(productId, existing.quantity + qty);
  }

  const data = await apiFetch(`${CART_API}/cart/items`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({
      product_id: Number(productId),
      quantity: Number(qty)
    })
  });

  if (data.error) throw new Error(data.error);

  await loadCart();
}

export async function updateQuantity(productId, quantity) {
  if (quantity < 1) {
    return removeItem(productId);
  }

  const data = await apiFetch(`${CART_API}/cart/items/${productId}`, {
    method: 'PATCH',
    credentials: 'include',
    body: JSON.stringify({ quantity: Number(quantity) })
  });

  if (data.error) throw new Error(data.error);

  await loadCart();
}

export async function removeItem(productId) {
  const data = await apiFetch(`${CART_API}/cart/items/${productId}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  if (data.error) throw new Error(data.error);

  await loadCart();
}

export async function clearCart() {
  const data = await apiFetch(`${CART_API}/cart`, {
    method: 'DELETE',
    credentials: 'include'
  });

  if (data.error) throw new Error(data.error);

  await loadCart();
}