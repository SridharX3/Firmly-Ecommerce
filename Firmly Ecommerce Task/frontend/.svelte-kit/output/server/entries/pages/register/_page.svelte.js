import { c as create_ssr_component, b as add_attribute, e as escape } from "../../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let email = "";
  let username = "";
  let phone_number = "";
  let password = "";
  let confirm_password = "";
  return `<h2 class="text-2xl font-bold mb-4" data-svelte-h="svelte-s69eaz">Register</h2> <form class="space-y-4"><input class="w-full border p-2 rounded" placeholder="Username"${add_attribute("value", username, 0)}> <input class="w-full border p-2 rounded" placeholder="Email"${add_attribute("value", email, 0)}> <input class="w-full border p-2 rounded" placeholder="Phone Number"${add_attribute("value", phone_number, 0)}> <input type="password" class="w-full border p-2 rounded" placeholder="Password"${add_attribute("value", password, 0)}> <input type="password" class="w-full border p-2 rounded" placeholder="Confirm Password"${add_attribute("value", confirm_password, 0)}> ${``} <button class="w-full bg-black text-white p-2 rounded" ${""}>${escape("Create account")}</button></form>`;
});
export {
  Page as default
};
