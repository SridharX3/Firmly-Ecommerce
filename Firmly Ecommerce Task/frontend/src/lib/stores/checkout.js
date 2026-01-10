import { writable, get } from 'svelte/store';
import { apiFetch } from '$lib/api/client';

const ORDER_API = 'https://order-worker.sridhar-89c.workers.dev';

export const checkout = writable({
  loading: false,
  error: null,
  step: 'shipping',
  summary: null,
  checkoutId: null
});

export async function submitShipping(address) {
  checkout.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    const data = await apiFetch(`${ORDER_API}/checkout/shipping`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ shipping_address: address })
    });

    if (data.error) {
      throw new Error(data.error || 'Failed to save shipping address');
    }

    checkout.update(s => ({
      ...s,
      loading: false,
      step: 'billing_address'
    }));

    return data;
  } catch (err) {
    checkout.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function submitBillingAddress(address) {
  checkout.update(s => ({ ...s, loading: true, error: null }));
  
  try {
    const data = await apiFetch(`${ORDER_API}/checkout/billing`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ billing_address: address })
    });

    if (data.error) {
      throw new Error(data.error || 'Failed to save billing address');
    }

    checkout.update(s => ({
      ...s,
      loading: false,
      step: 'delivery'
    }));

    return data;
  } catch (err) {
    checkout.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function submitDelivery(deliveryType) {
  checkout.update(s => ({ ...s, loading: true, error: null }));

  try {
    const data = await apiFetch(`${ORDER_API}/checkout/delivery`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ delivery_type: deliveryType })
    });

    if (data.error) {
      throw new Error(data.error || 'Failed to update delivery method');
    }

    checkout.update(s => ({
      ...s,
      loading: false,
      summary: data.summary,
      step: 'payment'
    }));

    return data;
  } catch (err) {
    checkout.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function cancelCheckout() {
  try {
    await apiFetch(`${ORDER_API}/checkout/cancel`, { 
      method: 'POST', 
      credentials: 'include'
    });
    checkout.set({ loading: false, error: null, step: 'shipping', summary: null, checkoutId: null });
  } catch (err) {
    console.error('Failed to cancel checkout:', err);
  }
}

export async function createPayPalOrder() {
  checkout.update(s => ({ ...s, loading: true, error: null }));
  try {
    const data = await apiFetch(`${ORDER_API}/payments/paypal/create`, { 
      method: 'POST', 
      credentials: 'include'
    });
    if (data.error) throw new Error(data.error || 'Payment initialization failed');
    
    checkout.update(s => ({ ...s, loading: false }));
    return data;
  } catch (err) {
    checkout.update(s => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}
