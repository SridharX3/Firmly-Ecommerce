import { c as create_ssr_component, a as subscribe, e as escape } from "../../chunks/ssr.js";
import { w as writable } from "../../chunks/index.js";
import { c as cart } from "../../chunks/cart.js";
const session = writable({
  loading: true,
  user: null
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $cart, $$unsubscribe_cart;
  let $session, $$unsubscribe_session;
  $$unsubscribe_cart = subscribe(cart, (value) => $cart = value);
  $$unsubscribe_session = subscribe(session, (value) => $session = value);
  $$unsubscribe_cart();
  $$unsubscribe_session();
  return `<header class="bg-black text-white p-4 flex justify-between items-center"><div class="flex items-center gap-6"><a href="/" class="font-bold text-lg" data-svelte-h="svelte-1nkpbd3">Firmly</a> <a href="/products" class="text-sm hover:underline" data-svelte-h="svelte-1qs65zy">Products</a> <a href="/cart" class="relative text-sm hover:underline">Cart
      ${$cart.items.length > 0 ? `<span class="absolute -top-2 -right-3 bg-red-600 text-xs px-2 py-0.5 rounded-full">${escape($cart.items.length)}</span>` : ``}</a> <a href="/order" class="text-sm hover:underline" data-svelte-h="svelte-1jg0wz3">Orders</a></div> ${!$session.loading ? `${$session.user ? `<button class="bg-red-600 px-3 py-1 rounded text-sm" data-svelte-h="svelte-sy4au1">Logout</button>` : `<a href="/login" class="underline text-sm" data-svelte-h="svelte-7sxbzq">Login</a>`}` : ``}</header> <main class="p-6 max-w-6xl mx-auto">${slots.default ? slots.default({}) : ``}</main>`;
});
export {
  Layout as default
};
