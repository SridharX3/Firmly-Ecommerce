<script>
  export let data;
</script>

<div class="max-w-4xl mx-auto py-10 px-4">
  <h1 class="text-3xl font-bold mb-8">My Orders</h1>

  {#if data.error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
      <p>Could not load orders: {data.error}</p>
      <p>Please ensure you are logged in.</p>
    </div>
  {:else if data.orders && data.orders.length > 0}
    <div class="space-y-6">
      {#each data.orders as order}
        <a href="/order/{order.id}" class="block border rounded-lg p-6 hover:shadow-lg transition">
          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-xl font-semibold">Order #{order.id}</h2>
              <p class="text-sm text-gray-500">Placed on: {new Date(order.created_at).toLocaleDateString()}</p>
              <p class="mt-2 text-sm">
                Status:
                <span class="font-medium px-2 py-1 rounded-full {
                  order.status === 'PAID' ? 'bg-green-100 text-green-700' :
                  order.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }">
                  {order.status}
                </span>
              </p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(order.total_amount)}
              </p>
              <p class="text-sm text-gray-500">{order.ordered_items.length} items</p>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {:else}
    <div class="text-center py-12 border rounded-lg bg-gray-50">
      <h2 class="text-xl font-bold mb-4">No Orders Found</h2>
      <p class="text-gray-600">You haven't placed any orders yet.</p>
      <a href="/" class="mt-6 inline-block bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition">
        Start Shopping
      </a>
    </div>
  {/if}
</div>
