import { c as create_ssr_component } from "../../../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
import "../../../../chunks/checkout.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${`<div class="flex justify-center items-center py-20" data-svelte-h="svelte-1sno7lg"><p class="text-lg text-gray-600">Finalizing payment...</p></div>`}`;
});
export {
  Page as default
};
