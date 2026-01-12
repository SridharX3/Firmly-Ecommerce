import { c as create_ssr_component, b as add_attribute, e as escape } from "../../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let email = "";
  let password = "";
  return `<h1 class="text-2xl font-bold mb-6" data-svelte-h="svelte-qxtk4v">Login</h1> ${``} <form class="space-y-4"><input type="email" placeholder="Email" class="border p-2 rounded w-full" required${add_attribute("value", email, 0)}> <input type="password" placeholder="Password" class="border p-2 rounded w-full" required${add_attribute("value", password, 0)}> <button class="bg-black text-white px-4 py-2 rounded w-full disabled:opacity-50" ${""}>${escape("Login")}</button> <a href="/register" class="block w-full text-center border border-black px-4 py-2 rounded hover:bg-gray-50" data-svelte-h="svelte-je7l8w">Register</a></form>`;
});
export {
  Page as default
};
