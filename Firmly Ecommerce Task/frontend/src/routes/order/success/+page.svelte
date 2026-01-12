<script>
  import Button from "$lib/components/ui/Button.svelte";
  import { onMount } from 'svelte';
  import { capturePayPalPayment } from '$lib/api/payment';
  import { apiFetch } from '$lib/api/client';
  import { ORDER_API } from '$lib/api/endpoints';
  import { goto } from '$app/navigation';
  import { checkout } from '$lib/stores/checkout';

  let status = 'processing';
  let error = null;
  let order = null;

  onMount(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paypalOrderId = params.get('token');

      if (!paypalOrderId) {
        throw new Error('Missing PayPal token');
      }

      const res = await capturePayPalPayment({
        paypal_order_id: paypalOrderId
      });

      if (!res?.success) {
        throw new Error(res?.error || 'Capture failed');
      }

      // Fetch order details using the ID from the response
      const orderId = res.order_id;
      if (orderId) {
        const orderRes = await apiFetch(`${ORDER_API}/orders/${orderId}`);
        order = orderRes;
      }

      // Clear checkout state on successful order
      checkout.set({
        loading: false,
        error: null,
        step: 'shipping',
        summary: null,
        checkoutId: null,
        savedShippingAddresses: [],
        savedBillingAddresses: []
      });
      status = 'success';
    } catch (e) {
      console.error(e);
      goto('/order');
    }
  });

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const parseJSON = (data) => {
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
  };
  const ui_button_styles_continue_shopping = "inline-block bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition";
</script>

{#if status === 'processing'}
  <div class="flex justify-center items-center py-20">
    <p class="text-lg text-gray-600">Finalizing payment...</p>
  </div>

{:else if status === 'success'}
  <div class="max-w-3xl mx-auto py-10 px-4">
    <div class="text-center mb-8">
      <h1 class="text-green-600 text-3xl font-bold mb-2">Payment Successful 🎉</h1>
      <p class="text-gray-600">Thank you for your order.</p>
    </div>

    {#if order}
      <div class="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div class="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <div>
            <span class="text-xs text-gray-500 uppercase tracking-wider">Order ID</span>
            <p class="font-mono font-medium">#{order.id}</p>
          </div>
          <div class="text-right">
            <span class="text-xs text-gray-500 uppercase tracking-wider">Date</span>
            <p class="font-medium text-sm">{formatDate(order.created_at)}</p>
          </div>
        </div>

        <div class="p-6">
          <div class="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 class="font-semibold mb-2">Shipping Address</h3>
              {#if order.shipping_address}
                {@const addr = parseJSON(order.shipping_address)}
                <address class="not-italic text-gray-600 text-sm">
                  <p>{addr?.full_name}</p>
                  <p>{addr?.address_line1}</p>
                  {#if addr?.address_line2}<p>{addr.address_line2}</p>{/if}
                  <p>{addr?.city}, {addr?.state} {addr?.postal_code}</p>
                  <p>{addr?.country}</p>
                  <p>{addr?.phone}</p>
                </address>
              {/if}
            </div>
            <div>
              <h3 class="font-semibold mb-2">Payment</h3>
              <p class="text-sm text-gray-600">Provider: {order.payment_provider}</p>
              <p class="text-sm text-gray-600">Status: <span class="uppercase font-bold text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">{order.status}</span></p>
            </div>
          </div>

          <div class="border-t pt-4">
            <h3 class="font-semibold mb-3">Items</h3>
            <div class="space-y-2">
              {#each (parseJSON(order.ordered_items) || []) as item}
                <div class="flex justify-between text-sm">
                  <span>{item.name || 'Item'} (x{item.quantity})</span>
                  <span>{formatCurrency(item.price, order.currency)}</span>
                </div>
              {/each}
            </div>
            <div class="border-t mt-4 pt-4 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(order.total_amount, order.currency)}</span>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <div class="mt-8 text-center">
      <Button href="/" ui_button_styles={ui_button_styles_continue_shopping}>Continue Shopping</Button>
    </div>
  </div>

{:else}
  <div class="text-center py-20">
    <h1 class="text-red-600 text-2xl font-bold mb-4">Payment Failed</h1>
    <p class="text-gray-600 mb-6">{error}</p>
    <Button href="/checkout" ui_button_styles={"text-blue-600 hover:underline"}>Return to Checkout</Button>
  </div>
{/if}
