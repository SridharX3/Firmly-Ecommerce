import { c as create_ssr_component, b as add_attribute, v as validate_component, d as each, e as escape } from "../../chunks/ssr.js";
import { B as Button } from "../../chunks/Button.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
const ui_button_styles_search = "bg-black text-white px-4 rounded";
const ui_button_styles_clear = "border px-4 rounded";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  let searchId = "";
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  return `<h1 class="text-3xl font-bold mb-6" data-svelte-h="svelte-11rnh0f">Products</h1>  <div class="flex gap-4 mb-6"><input class="border p-2 rounded w-64" placeholder="Search by product ID"${add_attribute("value", searchId, 0)}> ${validate_component(Button, "Button").$$render(
    $$result,
    {
      ui_button_styles: ui_button_styles_search
    },
    {},
    {
      default: () => {
        return `Search`;
      }
    }
  )} ${data.searchId ? `${validate_component(Button, "Button").$$render($$result, { ui_button_styles: ui_button_styles_clear }, {}, {
    default: () => {
      return `Clear`;
    }
  })}` : ``}</div>  ${data.products.length === 0 ? `<p data-svelte-h="svelte-1k0dofz">No products found.</p>` : `<div class="grid grid-cols-1 md:grid-cols-3 gap-6">${each(data.products, (product) => {
    return `<div class="border rounded-xl p-4 shadow hover:shadow-lg transition"><img${add_attribute("src", product.image_url, 0)}${add_attribute("alt", product.name, 0)} class="w-full h-48 object-cover object-center mb-4 rounded-xl"> <h2 class="text-lg font-semibold">${escape(product.name)}</h2> <p class="text-xl font-bold mt-2">$${escape(product.price)}</p> <span class="${"inline-block mt-2 px-3 py-1 text-sm rounded-full " + escape(
      product.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600",
      true
    )}">${escape(product.status)}</span> ${validate_component(Button, "Button").$$render(
      $$result,
      {
        ui_button_styles: "mt-4 w-full border rounded py-2 hover:bg-black hover:text-white"
      },
      {},
      {
        default: () => {
          return `View Details
        `;
        }
      }
    )} </div>`;
  })}</div>`}  ${!data.searchId ? `<div class="flex justify-center gap-4 mt-10">${validate_component(Button, "Button").$$render(
    $$result,
    {
      ui_button_styles: "border px-4 py-2 rounded disabled:opacity-50",
      disabled: data.page <= 1
    },
    {},
    {
      default: () => {
        return `Previous`;
      }
    }
  )} <span class="px-4 py-2">Page ${escape(data.page)} of ${escape(data.totalPages)}</span> ${validate_component(Button, "Button").$$render(
    $$result,
    {
      ui_button_styles: "border px-4 py-2 rounded disabled:opacity-50",
      disabled: data.page >= data.totalPages
    },
    {},
    {
      default: () => {
        return `Next`;
      }
    }
  )}</div>` : ``}`;
});
export {
  Page as default
};
