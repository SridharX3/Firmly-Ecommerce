import { c as create_ssr_component, v as validate_component, b as add_attribute, e as escape, d as each } from "../../../../chunks/ssr.js";
import { B as Button } from "../../../../chunks/Button.js";
const ui_button_styles_back = "mb-6 text-sm underline";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  const { product } = data;
  let quantity = 1;
  let adding = false;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  return `<div class="max-w-5xl mx-auto p-6">${validate_component(Button, "Button").$$render($$result, { ui_button_styles: ui_button_styles_back }, {}, {
    default: () => {
      return `← Back`;
    }
  })} <div class="grid md:grid-cols-2 gap-10"><div class="bg-gray-100 rounded-xl h-80 flex items-center justify-center overflow-hidden p-4">${product.image_url ? `<img${add_attribute("src", product.image_url, 0)}${add_attribute("alt", product.name, 0)} class="w-full h-full object-contain">` : `<span class="text-gray-400" data-svelte-h="svelte-ww8iqc">No Image Available</span>`}</div> <div><h1 class="text-3xl font-bold">${escape(product.name)}</h1> <p class="text-2xl font-semibold mt-4">$${escape(product.price)}</p> <span class="inline-block mt-3 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">${escape(product.status)}</span>  <div class="mt-6 flex items-center gap-4"><span class="text-sm font-medium" data-svelte-h="svelte-1dp07k1">Quantity</span> <div class="flex items-center border rounded-lg overflow-hidden">${validate_component(Button, "Button").$$render(
    $$result,
    {
      ui_button_styles: "px-4 py-2 text-lg",
      disabled: quantity === 1
    },
    {},
    {
      default: () => {
        return `−`;
      }
    }
  )} <span class="px-6 py-2 min-w-[3rem] text-center">${escape(quantity)}</span> ${validate_component(Button, "Button").$$render($$result, { ui_button_styles: "px-4 py-2 text-lg" }, {}, {
    default: () => {
      return `+`;
    }
  })}</div></div>  ${validate_component(Button, "Button").$$render(
    $$result,
    {
      ui_button_styles: "mt-6 bg-black text-white px-6 py-3 rounded-xl disabled:opacity-50",
      disabled: product.status !== "active" || adding
    },
    {},
    {
      default: () => {
        return `${escape("Add to Cart")}`;
      }
    }
  )}</div></div> <div class="mt-12"><h2 class="text-xl font-semibold mb-4" data-svelte-h="svelte-66obv6">Specifications</h2> <div class="border rounded-lg overflow-hidden"><table class="w-full text-left text-sm"><thead class="bg-gray-50 border-b" data-svelte-h="svelte-58iwta"><tr><th class="px-6 py-3 font-medium text-gray-500">Feature</th> <th class="px-6 py-3 font-medium text-gray-500">Details</th></tr></thead> <tbody class="divide-y divide-gray-100">${each(Object.entries(product.specs || {}), ([key, value]) => {
    return `<tr><td class="px-6 py-4 font-medium capitalize align-top w-1/4">${escape(key.replace(/_/g, " "))}</td> <td class="px-6 py-4 text-gray-600">${typeof value === "object" && value !== null ? `${Array.isArray(value) ? `${value.length > 0 && typeof value[0] === "object" ? `<ul class="list-disc list-inside text-sm space-y-1">${each(value, (item) => {
      return `<li>${escape(Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(", "))} </li>`;
    })} </ul>` : `${escape(value.join(", "))}`}` : `<div class="space-y-2">${each(Object.entries(value), ([subKey, subValue]) => {
      return `<div class="flex flex-col sm:flex-row sm:gap-2"><span class="font-medium text-gray-500 capitalize min-w-[100px]">${escape(subKey.replace(/_/g, " "))}:</span> <span class="text-gray-700">${typeof subValue === "object" && subValue !== null ? `${Array.isArray(subValue) ? `${subValue.length > 0 && typeof subValue[0] === "object" ? `<ul class="list-disc list-inside ml-2">${each(subValue, (item) => {
        return `<li>${escape(Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(", "))}</li>`;
      })} </ul>` : `${escape(subValue.join(", "))}`}` : `${escape(Object.entries(subValue).map(([k, v]) => {
        const valStr = Array.isArray(v) ? v.join(", ") : v;
        return `${k.replace(/_/g, " ")}: ${valStr}`;
      }).join(", "))}`}` : `${escape(subValue)}`}</span> </div>`;
    })} </div>`}` : `${escape(value)}`}</td> </tr>`;
  })}</tbody></table></div></div></div>`;
});
export {
  Page as default
};
