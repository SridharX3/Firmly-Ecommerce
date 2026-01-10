<script>
  import Button from "$lib/components/ui/Button.svelte";
  export let data;
  import { formatCurrency } from '$lib/utils/currency';

  const ui_button_styles = "text-blue-600 hover:underline";
</script>

<div class="max-w-4xl mx-auto py-10 px-4">
  {#if data.order}
    <h1 class="text-3xl font-bold mb-2">Order #{data.order.id}</h1>
    <p class="text-gray-600 mb-8">Placed on {new Date(data.order.created_at).toLocaleDateString()}</p>

    <div class="grid md:grid-cols-3 gap-8">
      <div class="md:col-span-2">
        <h2 class="text-xl font-semibold mb-4">Order Items</h2>
        <div class="space-y-4">
          {#each data.order.ordered_items as item}
            <div class="flex items-center space-x-4 border-b pb-4">

              <div class="flex-1">
                <p class="font-semibold">{item.name}</p>
                <p class="text-sm text-gray-500">Qty: {item.quantity}</p>
              </div>
              <p class="font-medium">{formatCurrency(item.price)}</p>
            </div>
          {/each}
        </div>
      </div>
      <div>
        <div class="bg-gray-50 p-6 rounded-lg">
          <h2 class="text-xl font-semibold mb-4">Order Summary</h2>
          <div class="space-y-4">
            <div>
              <p class="text-sm text-gray-500">Status</p>
              <p class="font-medium px-2 py-1 rounded-full text-sm inline-block {
                data.order.status === 'PAID' ? 'bg-green-100 text-green-700' :
                data.order.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-600'
              }">
                {data.order.status}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Delivery</p>
              <p class="font-medium">{data.order.delivery_mode}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Payment Reference</p>
              <p class="font-medium">{data.order.payment_reference}</p>
            </div>
            <div class="border-t mt-4 pt-4">
              <p class="text-sm text-gray-500">Total</p>
              <p class="font-bold text-lg">{formatCurrency(data.order.total_amount)}</p>
            </div>
          </div>
        </div>
        <div class="mt-8">
          <h3 class="text-lg font-semibold mb-2">Shipping Address</h3>
          <address class="not-italic text-gray-600">
            {data.order.shipping_address.full_name}<br>
            {data.order.shipping_address.address_line1}<br>
            {#if data.order.shipping_address.address_line2}
              {data.order.shipping_address.address_line2}<br>
            {/if}
            {data.order.shipping_address.city}, {data.order.shipping_address.state} {data.order.shipping_address.postal_code}<br>
            {data.order.shipping_address.country}
          </address>
        </div>
      </div>
    </div>
  {:else}
    <div class="text-center py-12 border rounded-lg bg-gray-50">
      <h2 class="text-xl font-bold mb-4">Order Not Found</h2>
      <p class="text-gray-600">We couldn't find the order you're looking for.</p>
    </div>
  {/if}
  <div class="mt-12 text-center">
    <Button href="/order" ui_button_styles={ui_button_styles}>&larr; Back to all orders</Button>
  </div>
</div>
