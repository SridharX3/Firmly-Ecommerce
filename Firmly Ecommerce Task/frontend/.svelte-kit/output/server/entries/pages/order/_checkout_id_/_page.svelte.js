import { c as create_ssr_component, e as escape, d as each, v as validate_component } from "../../../../chunks/ssr.js";
import { B as Button } from "../../../../chunks/Button.js";
function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}
const ui_button_styles = "text-blue-600 hover:underline";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  return `<div class="max-w-4xl mx-auto py-10 px-4">${data.order ? `<h1 class="text-3xl font-bold mb-2">Order #${escape(data.order.id)}</h1> <p class="text-gray-600 mb-8">Placed on ${escape(new Date(data.order.created_at).toLocaleDateString())}</p> <div class="grid md:grid-cols-3 gap-8"><div class="md:col-span-2"><h2 class="text-xl font-semibold mb-4" data-svelte-h="svelte-1t63tj4">Order Items</h2> <div class="space-y-4">${each(data.order.ordered_items, (item) => {
    return `<div class="flex items-center space-x-4 border-b pb-4"><div class="flex-1"><p class="font-semibold">${escape(item.name)}</p> <p class="text-sm text-gray-500">Qty: ${escape(item.quantity)}</p></div> <p class="font-medium">${escape(formatCurrency(item.price))}</p> </div>`;
  })}</div></div> <div><div class="bg-gray-50 p-6 rounded-lg"><h2 class="text-xl font-semibold mb-4" data-svelte-h="svelte-vvnw64">Order Summary</h2> <div class="space-y-4"><div><p class="text-sm text-gray-500" data-svelte-h="svelte-9jwcxo">Status</p> <p class="${"font-medium px-2 py-1 rounded-full text-sm inline-block " + escape(
    data.order.status === "PAID" ? "bg-green-100 text-green-700" : data.order.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600",
    true
  )}">${escape(data.order.status)}</p></div> <div><p class="text-sm text-gray-500" data-svelte-h="svelte-sevq9e">Delivery</p> <p class="font-medium">${escape(data.order.delivery_mode)}</p></div> <div><p class="text-sm text-gray-500" data-svelte-h="svelte-de0lap">Payment Reference</p> <p class="font-medium">${escape(data.order.payment_reference)}</p></div> <div class="border-t mt-4 pt-4"><p class="text-sm text-gray-500" data-svelte-h="svelte-1nkkz7c">Total</p> <p class="font-bold text-lg">${escape(formatCurrency(data.order.total_amount))}</p></div></div></div> <div class="mt-8"><h3 class="text-lg font-semibold mb-2" data-svelte-h="svelte-xlkfil">Shipping Address</h3> <address class="not-italic text-gray-600">${escape(data.order.shipping_address.full_name)}<br> ${escape(data.order.shipping_address.address_line1)}<br> ${data.order.shipping_address.address_line2 ? `${escape(data.order.shipping_address.address_line2)}<br>` : ``} ${escape(data.order.shipping_address.city)}, ${escape(data.order.shipping_address.state)} ${escape(data.order.shipping_address.postal_code)}<br> ${escape(data.order.shipping_address.country)}</address></div></div></div>` : `<div class="text-center py-12 border rounded-lg bg-gray-50" data-svelte-h="svelte-p8azts"><h2 class="text-xl font-bold mb-4">Order Not Found</h2> <p class="text-gray-600">We couldn&#39;t find the order you&#39;re looking for.</p></div>`} <div class="mt-12 text-center">${validate_component(Button, "Button").$$render($$result, { href: "/order", ui_button_styles }, {}, {
    default: () => {
      return `← Back to all orders`;
    }
  })}</div></div>`;
});
export {
  Page as default
};
