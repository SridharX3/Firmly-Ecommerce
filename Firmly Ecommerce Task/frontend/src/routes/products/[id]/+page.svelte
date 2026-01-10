<script>
  import Button from "$lib/components/ui/Button.svelte";
  import { addToCart } from '$lib/stores/cart';

  export let data;
  const { product } = data;

  let quantity = 1;
  let adding = false;

  function increase() {
    quantity += 1;
  }

  function decrease() {
    if (quantity > 1) quantity -= 1;
  }

  async function handleAddToCart() {
    try {
      adding = true;
      await addToCart(product.id, quantity);
    } catch (err) {
      if (err.message.includes('not logged in')) {
        if (confirm('You need to log in to add items to your cart. Go to login page?')) {
          window.location.href = '/login';
        }
      } else {
        alert('Failed to add item to cart');
      }
    } finally {
      adding = false;
    }
  }
  const ui_button_styles_back = "mb-6 text-sm underline";
</script>

<div class="max-w-5xl mx-auto p-6">
  <Button
    ui_button_styles={ui_button_styles_back}
    on:click={() => history.back()}
  >
    ← Back
  </Button>

  <div class="grid md:grid-cols-2 gap-10">
    <div class="bg-gray-100 rounded-xl h-80 flex items-center justify-center overflow-hidden p-4">
      {#if product.image_url}
        <img src={product.image_url} alt={product.name} class="w-full h-full object-contain" />
      {:else}
        <span class="text-gray-400">No Image Available</span>
      {/if}
    </div>

    <div>
      <h1 class="text-3xl font-bold">{product.name}</h1>
      <p class="text-2xl font-semibold mt-4">${product.price}</p>

      <span class="inline-block mt-3 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
        {product.status}
      </span>

      <!-- 🔢 Quantity selector -->
      <div class="mt-6 flex items-center gap-4">
        <span class="text-sm font-medium">Quantity</span>

        <div class="flex items-center border rounded-lg overflow-hidden">
          <Button
            ui_button_styles={"px-4 py-2 text-lg"}
            on:click={decrease}
            disabled={quantity === 1}
          >
            −
          </Button>

          <span class="px-6 py-2 min-w-[3rem] text-center">
            {quantity}
          </span>

          <Button
            ui_button_styles={"px-4 py-2 text-lg"}
            on:click={increase}
          >
            +
          </Button>
        </div>
      </div>

      <!-- 🛒 Add to cart -->
      <Button
        ui_button_styles={"mt-6 bg-black text-white px-6 py-3 rounded-xl disabled:opacity-50"}
        disabled={product.status !== 'active' || adding}
        on:click={handleAddToCart}
      >
        {adding ? 'Adding…' : 'Add to Cart'}
      </Button>
    </div>
          </div>
      
        <div class="mt-12">    <h2 class="text-xl font-semibold mb-4">Specifications</h2>
    <div class="border rounded-lg overflow-hidden">
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="px-6 py-3 font-medium text-gray-500">Feature</th>
            <th class="px-6 py-3 font-medium text-gray-500">Details</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each Object.entries(product.specs || {}) as [key, value]}
            <tr>
              <td class="px-6 py-4 font-medium capitalize align-top w-1/4">{key.replace(/_/g, ' ')}</td>
              <td class="px-6 py-4 text-gray-600">
                {#if typeof value === 'object' && value !== null}
                  {#if Array.isArray(value)}
                    {#if value.length > 0 && typeof value[0] === 'object'}
                      <ul class="list-disc list-inside text-sm space-y-1">
                        {#each value as item}
                          <li>
                            {Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </li>
                        {/each}
                      </ul>
                    {:else}
                      {value.join(', ')}
                    {/if}
                  {:else}
                    <div class="space-y-2">
                      {#each Object.entries(value) as [subKey, subValue]}
                        <div class="flex flex-col sm:flex-row sm:gap-2">
                          <span class="font-medium text-gray-500 capitalize min-w-[100px]">
                            {subKey.replace(/_/g, ' ')}:
                          </span>
                          <span class="text-gray-700">
                            {#if typeof subValue === 'object' && subValue !== null}
                              {#if Array.isArray(subValue)}
                                {#if subValue.length > 0 && typeof subValue[0] === 'object'}
                                  <ul class="list-disc list-inside ml-2">
                                    {#each subValue as item}
                                      <li>{Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ')}</li>
                                    {/each}
                                  </ul>
                                {:else}
                                  {subValue.join(', ')}
                                {/if}
                              {:else}
                                {Object.entries(subValue).map(([k, v]) => {
                                  const valStr = Array.isArray(v) ? v.join(', ') : v;
                                  return `${k.replace(/_/g, ' ')}: ${valStr}`;
                                }).join(', ')}
                              {/if}
                            {:else}
                              {subValue}
                            {/if}
                          </span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                {:else}
                  {value}
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
