import { c as create_ssr_component, d as each, v as validate_component, e as escape, b as add_attribute } from "../../../chunks/ssr.js";
import { B as Button } from "../../../chunks/Button.js";
const ui_button_styles_add_to_cart = "w-full bg-black text-white py-2 rounded disabled:opacity-50";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let products = [];
  let page = 1;
  let totalPages = 1;
  let adding = /* @__PURE__ */ new Set();
  return `<h1 class="text-3xl font-bold mb-6" data-svelte-h="svelte-11rnh0f">Products</h1> ${`<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">${each(products, (product) => {
    return `<div class="border rounded-xl p-4 shadow hover:shadow-lg transition flex flex-col"><div class="h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden flex items-center justify-center p-2"><img${add_attribute("src", product.image_url || "https://via.placeholder.com/150", 0)}${add_attribute("alt", product.name, 0)} class="w-full h-full object-contain" loading="lazy"></div> <h2 class="font-semibold text-lg">${escape(product.name)}</h2> <p class="text-gray-700 mt-1">$${escape(product.price)}</p> <span class="text-sm text-gray-500 capitalize mt-1">${escape(product.status)}</span> <div class="mt-auto space-y-2 pt-4"> ${validate_component(Button, "Button").$$render(
      $$result,
      {
        ui_button_styles: ui_button_styles_add_to_cart,
        disabled: product.status !== "active" || adding.has(product.id)
      },
      {},
      {
        default: () => {
          return `${escape(adding.has(product.id) ? "Adding..." : "Add to Cart")} `;
        }
      }
    )} ${validate_component(Button, "Button").$$render(
      $$result,
      {
        href: `/products/${product.id}`,
        ui_button_styles: "block text-center border py-2 rounded"
      },
      {},
      {
        default: () => {
          return `View Details
          `;
        }
      }
    )}</div> </div>`;
  })}</div>`} <div class="flex justify-between items-center mt-10">${validate_component(Button, "Button").$$render(
    $$result,
    {
      disabled: page === 1,
      ui_button_styles: "px-4 py-2 border rounded disabled:opacity-50"
    },
    {},
    {
      default: () => {
        return `Previous`;
      }
    }
  )} <span>Page ${escape(page)} of ${escape(totalPages)}</span> ${validate_component(Button, "Button").$$render(
    $$result,
    {
      disabled: page === totalPages,
      ui_button_styles: "px-4 py-2 border rounded disabled:opacity-50"
    },
    {},
    {
      default: () => {
        return `Next`;
      }
    }
  )}</div>`;
});
export {
  Page as default
};
