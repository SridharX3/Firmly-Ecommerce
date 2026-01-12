import { c as create_ssr_component, e as escape, d as each } from "../../../chunks/ssr.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  return `<div class="max-w-4xl mx-auto py-10 px-4"><h1 class="text-3xl font-bold mb-8" data-svelte-h="svelte-1eyxdgu">My Orders</h1> ${data.error ? `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"><p>Could not load orders: ${escape(data.error)}</p> <p data-svelte-h="svelte-1ecvf0q">Please ensure you are logged in.</p></div>` : `${data.orders && data.orders.length > 0 ? `<div class="space-y-6">${each(data.orders, (order) => {
    return `<a href="${"/order/" + escape(order.id, true)}" class="block border rounded-lg p-6 hover:shadow-lg transition"><div class="flex justify-between items-start"><div><h2 class="text-xl font-semibold">Order #${escape(order.id)}</h2> <p class="text-sm text-gray-500">Placed on: ${escape(new Date(order.created_at).toLocaleDateString())}</p> <p class="mt-2 text-sm">Status:
                <span class="${"font-medium px-2 py-1 rounded-full " + escape(
      order.status === "PAID" ? "bg-green-100 text-green-700" : order.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600",
      true
    )}">${escape(order.status)}</span> </p></div> <div class="text-right"><p class="text-lg font-bold">${escape(new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: order.currency
      }
    ).format(order.total_amount))}</p> <p class="text-sm text-gray-500">${escape(order.ordered_items.length)} items</p> </div></div> </a>`;
  })}</div>` : `<div class="text-center py-12 border rounded-lg bg-gray-50" data-svelte-h="svelte-1bdtge4"><h2 class="text-xl font-bold mb-4">No Orders Found</h2> <p class="text-gray-600">You haven&#39;t placed any orders yet.</p> <a href="/" class="mt-6 inline-block bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition">Start Shopping</a></div>`}`}</div>`;
});
export {
  Page as default
};
