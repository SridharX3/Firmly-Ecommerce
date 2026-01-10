<script>
  import { onMount } from 'svelte';
  import { session, loadSession, logout } from '$lib/stores/session';
  import { cart, loadCart } from '$lib/stores/cart';
  import '../app.css';

  onMount(async () => {
    await loadSession();
    await loadCart();
  });
</script>

<header class="bg-black text-white p-4 flex justify-between items-center">
  <div class="flex items-center gap-6">
    <a href="/" class="font-bold text-lg">Firmly</a>

    <a href="/products" class="text-sm hover:underline">
      Products
    </a>

    <a href="/cart" class="relative text-sm hover:underline">
      Cart
      {#if $cart.items.length > 0}
        <span
          class="absolute -top-2 -right-3 bg-red-600 text-xs px-2 py-0.5 rounded-full"
        >
          {$cart.items.length}
        </span>
      {/if}
    </a>

    {#if $session.user}
      <a href="/order" class="text-sm hover:underline">
        Orders
      </a>
    {/if}
  </div>

  {#if !$session.loading}
    {#if $session.user}
      <button
        on:click={logout}
        class="bg-red-600 px-3 py-1 rounded text-sm"
      >
        Logout
      </button>
    {:else}
      <a href="/login" class="underline text-sm">Login</a>
    {/if}
  {/if}
</header>

<main class="p-6 max-w-6xl mx-auto">
  <slot />
</main>
