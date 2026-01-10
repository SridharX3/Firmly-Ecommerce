<script>
  import Button from "$lib/components/ui/Button.svelte";
  import { goto } from '$app/navigation';
  export let data;

  let searchId = '';

  const ui_button_styles_search = "bg-black text-white px-4 rounded";
  const ui_button_styles_clear = "border px-4 rounded";
</script>

<h1 class="text-3xl font-bold mb-6">Products</h1>

<!-- 🔍 Search -->
<div class="flex gap-4 mb-6">
  <input
    class="border p-2 rounded w-64"
    placeholder="Search by product ID"
    bind:value={searchId}
  />

  <Button
    ui_button_styles={ui_button_styles_search}
    on:click={() => goto(`/?product_id=${searchId}`)}
  >
    Search
  </Button>

  {#if data.searchId}
    <Button
      ui_button_styles={ui_button_styles_clear}
      on:click={() => goto('/')}
    >
      Clear
    </Button>
  {/if}
</div>

<!-- 🧱 Products -->
{#if data.products.length === 0}
  <p>No products found.</p>
{:else}
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    {#each data.products as product}
      <div class="border rounded-xl p-4 shadow hover:shadow-lg transition">
        <img src={product.image_url} alt={product.name} class="w-full h-48 object-cover object-center mb-4 rounded-xl" />
        <h2 class="text-lg font-semibold">{product.name}</h2>

        <p class="text-xl font-bold mt-2">${product.price}</p>

        <span
          class="inline-block mt-2 px-3 py-1 text-sm rounded-full
            {product.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'}"
        >
          {product.status}
        </span>

        <Button
          ui_button_styles={"mt-4 w-full border rounded py-2 hover:bg-black hover:text-white"}
          on:click={() => goto(`/products/${product.id}`)}
        >
          View Details
        </Button>
      </div>
    {/each}
  </div>
{/if}

<!-- 📄 Pagination -->
{#if !data.searchId}
  <div class="flex justify-center gap-4 mt-10">
    <Button
      ui_button_styles={"border px-4 py-2 rounded disabled:opacity-50"}
      disabled={data.page <= 1}
      on:click={() => goto(`/?page=${data.page - 1}`)}
    >
      Previous
    </Button>

    <span class="px-4 py-2">
      Page {data.page} of {data.totalPages}
    </span>

    <Button
      ui_button_styles={"border px-4 py-2 rounded disabled:opacity-50"}
      disabled={data.page >= data.totalPages}
      on:click={() => goto(`/?page=${data.page + 1}`)}
    >
      Next
    </Button>
  </div>
{/if}
