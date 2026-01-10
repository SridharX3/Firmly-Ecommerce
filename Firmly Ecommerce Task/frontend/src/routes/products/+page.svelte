<script>
  import Button from "$lib/components/ui/Button.svelte";
  import { onMount } from 'svelte';
  import { apiFetch } from '$lib/api/client';
  import { PRODUCTS_API } from '$lib/api/endpoints';
  import { addToCart } from '$lib/stores/cart';

  let products = [];
  let page = 1;
  let totalPages = 1;
  let loading = false;

  // ⚠️ keep Set, but reassign it for reactivity
  let adding = new Set();

  async function fetchProducts() {
    loading = true;

    const res = await apiFetch(`${PRODUCTS_API}/products`, {
      headers: {
        'X-Page': String(page)
      }
    });

    products = res.data;
    totalPages = res.totalPages;
    loading = false;
  }

  async function handleAddToCart(productId) {
    // ✅ force reactive update
    adding = new Set(adding).add(productId);

    try {
      await addToCart(productId, 1);
      console.log('Added to cart:', productId);
    } catch (err) {
      if (err.message.includes('not logged in')) {
        if (confirm('You need to log in to add items to your cart. Go to login page?')) {
          window.location.href = '/login';
        }
      } else {
        alert('Failed to add item to cart');
      }
    } finally {
      // ✅ force reactive update
      const next = new Set(adding);
      next.delete(productId);
      adding = next;
    }
  }

  function next() {
    if (page < totalPages) {
      page++;
      fetchProducts();
    }
  }

  function prev() {
    if (page > 1) {
      page--;
      fetchProducts();
    }
  }

  onMount(fetchProducts);

  const ui_button_styles_add_to_cart = "w-full bg-black text-white py-2 rounded disabled:opacity-50";
</script>

<h1 class="text-3xl font-bold mb-6">Products</h1>

{#if loading}
  <p>Loading...</p>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each products as product}
      <div class="border rounded-xl p-4 shadow hover:shadow-lg transition flex flex-col">
        <div class="h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden flex items-center justify-center p-2">
          <img
            src={product.image_url || 'https://via.placeholder.com/150'}
            alt={product.name}
            class="w-full h-full object-contain"
            loading="lazy"
            on:error={(e) => (e.target.src = 'https://via.placeholder.com/150')}
          />
        </div>

        <h2 class="font-semibold text-lg">{product.name}</h2>

        <p class="text-gray-700 mt-1">${product.price}</p>

        <span class="text-sm text-gray-500 capitalize mt-1">
          {product.status}
        </span>

        <div class="mt-auto space-y-2 pt-4">
          <!-- 🛒 ADD TO CART -->
          <Button
            ui_button_styles={ui_button_styles_add_to_cart}
            disabled={product.status !== 'active' || adding.has(product.id)}
            on:click={() => handleAddToCart(product.id)}
          >
            {adding.has(product.id) ? 'Adding...' : 'Add to Cart'}
          </Button>

          <Button
            href={`/products/${product.id}`}
            ui_button_styles={"block text-center border py-2 rounded"}
          >
            View Details
          </Button>
        </div>
      </div>
    {/each}
  </div>
{/if}

<div class="flex justify-between items-center mt-10">
  <Button
    on:click={prev}
    disabled={page === 1}
    ui_button_styles={"px-4 py-2 border rounded disabled:opacity-50"}
  >
    Previous
  </Button>

  <span>Page {page} of {totalPages}</span>

  <Button
    on:click={next}
    disabled={page === totalPages}
    ui_button_styles={"px-4 py-2 border rounded disabled:opacity-50"}
  >
    Next
  </Button>
</div>
