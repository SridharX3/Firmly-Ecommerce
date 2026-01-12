import { c as create_ssr_component, a as subscribe, e as escape, d as each, b as add_attribute } from "../../../chunks/ssr.js";
import { c as cart } from "../../../chunks/cart.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $cart, $$unsubscribe_cart;
  $$unsubscribe_cart = subscribe(cart, (value) => $cart = value);
  const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  $$unsubscribe_cart();
  return `<h1 class="text-3xl font-bold mb-6" data-svelte-h="svelte-1r1fji8">Your Cart</h1> ${$cart.loading ? `<p data-svelte-h="svelte-1gwqeww">Loading cart...</p>` : `${$cart.error ? `${$cart.error.toLowerCase().includes("not logged in") ? `<div class="text-center py-12" data-svelte-h="svelte-ee12ky"><h2 class="text-2xl font-bold mb-4">Please Log In</h2> <p class="text-gray-500 mb-6">You need to be logged in to view your cart.</p> <a href="/login" class="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition">Log In</a></div>` : `<p class="text-red-600">Error: ${escape($cart.error)}</p>`}` : `${$cart.items.length === 0 ? `<p class="text-gray-500" data-svelte-h="svelte-fx2gl2">Your cart is empty.</p>` : `<div class="space-y-4">${each($cart.items, (item) => {
    return `<div class="flex justify-between items-center border p-4 rounded-lg"><div class="flex items-center"><img${add_attribute("src", item.image_url, 0)}${add_attribute("alt", item.name, 0)} class="h-16 w-16 object-contain mr-4"> <div><h2 class="font-semibold">${escape(item.name)}</h2> <p class="text-sm text-gray-500">${escape(currencyFormatter.format(item.price))} × ${escape(item.quantity)}</p> </div></div> <div class="flex items-center gap-3"><button class="border px-2 rounded" data-svelte-h="svelte-1058p23">−</button> <span class="w-6 text-center">${escape(item.quantity)}</span> <button class="border px-2 rounded" data-svelte-h="svelte-xzqmie">+</button> <button class="text-red-600 underline ml-4" data-svelte-h="svelte-89a5tv">Remove
          </button></div> </div>`;
  })}</div> <div class="mt-8 border-t pt-6 flex justify-between items-center"><div><p class="text-lg font-semibold">Subtotal: ${escape(currencyFormatter.format($cart.subtotal))}</p> <p class="text-sm text-gray-500" data-svelte-h="svelte-t94fpn">Currency: USD</p></div> <div class="flex gap-4"><button class="border px-4 py-2 rounded" data-svelte-h="svelte-12fp0u5">Clear Cart</button> <a href="/checkout" class="bg-black text-white px-6 py-2 rounded" data-svelte-h="svelte-nprj18">Checkout</a></div></div>`}`}`}`;
});
export {
  Page as default
};
