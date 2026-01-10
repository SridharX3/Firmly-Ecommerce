<script>
  import { onMount } from 'svelte';
  import {
    cart,
    loadCart,
    updateQuantity,
    removeItem,
    clearCart
  } from '$lib/stores/cart';

  onMount(loadCart);

  function increase(item) {
    updateQuantity(item.product_id, item.quantity + 1);
  }

  function decrease(item) {
    updateQuantity(item.product_id, item.quantity - 1);
  }

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });
</script>

<h1 class="text-3xl font-bold mb-6">Your Cart</h1>

{#if $cart.loading}
  <p>Loading cart...</p>

{:else if $cart.error}
  {#if $cart.error.toLowerCase().includes('not logged in')}
    <div class="text-center py-12">
      <h2 class="text-2xl font-bold mb-4">Please Log In</h2>
      <p class="text-gray-500 mb-6">You need to be logged in to view your cart.</p>
      <a href="/login" class="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition">Log In</a>
    </div>
  {:else}
    <p class="text-red-600">Error: {$cart.error}</p>
  {/if}

{:else if $cart.items.length === 0}
  <p class="text-gray-500">Your cart is empty.</p>

{:else}
  <div class="space-y-4">
    {#each $cart.items as item}
      <div class="flex justify-between items-center border p-4 rounded-lg">
        <div class="flex items-center">
          <img src={item.image_url} alt={item.name} class="h-16 w-16 object-contain mr-4" />
          <div>
            <h2 class="font-semibold">{item.name}</h2>
            <p class="text-sm text-gray-500">
              {currencyFormatter.format(item.price)} × {item.quantity}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            class="border px-2 rounded"
            on:click={() => decrease(item)}
          >
            −
          </button>

          <span class="w-6 text-center">{item.quantity}</span>

          <button
            class="border px-2 rounded"
            on:click={() => increase(item)}
          >
            +
          </button>

          <button
            class="text-red-600 underline ml-4"
            on:click={() => removeItem(item.product_id)}
          >
            Remove
          </button>
        </div>
      </div>
    {/each}
  </div>

  <div class="mt-8 border-t pt-6 flex justify-between items-center">
    <div>
      <p class="text-lg font-semibold">
        Subtotal: {currencyFormatter.format($cart.subtotal)}
      </p>
      <p class="text-sm text-gray-500">
        Currency: USD
      </p>
    </div>

    <div class="flex gap-4">
      <button
        class="border px-4 py-2 rounded"
        on:click={clearCart}
      >
        Clear Cart
      </button>

      <a
        href="/checkout"
        class="bg-black text-white px-6 py-2 rounded"
      >
        Checkout
      </a>
    </div>
  </div>
{/if}
