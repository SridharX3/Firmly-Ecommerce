import { writable, get } from 'svelte/store';
import { apiFetch } from '$lib/api/client';
import { AUTH_API } from '$lib/api/endpoints';

const ORDER_API = 'https://order-worker.sridhar-89c.workers.dev';

const loadState = () => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const stored = localStorage.getItem('checkout_state');
    if (!stored) return null;
    const state = JSON.parse(stored);
    // Reset loading and error states so we don't get stuck
    return { ...state, loading: false, error: null };
  } catch (e) {
    return null;
  }
};

export const checkout = writable(loadState() || {
  loading: false,
  error: null,
  step: 'shipping',
  summary: null,
  checkoutId: null,
  savedShippingAddresses: [],
  savedBillingAddresses: []
});

checkout.subscribe(state => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('checkout_state', JSON.stringify(state));
  }
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

export async function loadSavedAddresses() {
  checkout.update(s => ({ ...s, loading: true, error: null }));
  try {
    const [shippingData, billingData] = await Promise.all([
      apiFetch(`${AUTH_API}/user/shipping-address`, { credentials: 'include' }),
      apiFetch(`${AUTH_API}/user/billing-address`, { credentials: 'include' })
    ]);

    checkout.update(s => ({
      ...s,
      loading: false,
      savedShippingAddresses: shippingData.addresses || [],
      savedBillingAddresses: billingData.addresses || []
    }));
  } catch (err) {
    console.error('Failed to load saved addresses:', err);
    checkout.update(s => ({ ...s, loading: false }));
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
