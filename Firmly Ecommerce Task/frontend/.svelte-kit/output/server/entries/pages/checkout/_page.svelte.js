import { c as create_ssr_component, a as subscribe, v as validate_component, e as escape, f as add_classes, d as each, b as add_attribute } from "../../../chunks/ssr.js";
import { B as Button } from "../../../chunks/Button.js";
import { c as cart } from "../../../chunks/cart.js";
import { c as checkout } from "../../../chunks/checkout.js";
const ui_button_styles_cancel = "text-sm text-red-600 hover:underline";
const ui_button_styles_login = "bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $checkout, $$unsubscribe_checkout;
  let $cart, $$unsubscribe_cart;
  $$unsubscribe_checkout = subscribe(checkout, (value) => $checkout = value);
  $$unsubscribe_cart = subscribe(cart, (value) => $cart = value);
  let shippingAddress = {
    full_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: ""
  };
  let sameAsShipping = true;
  let selectedShippingId = "new";
  const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  $$unsubscribe_checkout();
  $$unsubscribe_cart();
  return `<div class="max-w-2xl mx-auto py-10 px-4"><div class="flex justify-between items-center mb-8"><h1 class="text-3xl font-bold" data-svelte-h="svelte-1ixfhb9">Checkout</h1> ${validate_component(Button, "Button").$$render(
    $$result,
    {
      ui_button_styles: ui_button_styles_cancel
    },
    {},
    {
      default: () => {
        return `Cancel &amp; Return to Cart`;
      }
    }
  )}</div> ${$cart.error && $cart.error.toLowerCase().includes("not logged in") ? `<div class="text-center py-12 border rounded-lg bg-gray-50"><h2 class="text-xl font-bold mb-4" data-svelte-h="svelte-1785yud">Please Log In</h2> <p class="text-gray-600 mb-6" data-svelte-h="svelte-6o61lq">You need to be logged in to proceed with checkout.</p> ${validate_component(Button, "Button").$$render(
    $$result,
    {
      href: "/login",
      ui_button_styles: ui_button_styles_login
    },
    {},
    {
      default: () => {
        return `Log In`;
      }
    }
  )}</div>` : `${$checkout.error ? `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">${escape($checkout.error)}</div>` : ``}  <div class="flex mb-8 text-sm font-medium text-gray-500"><span${add_classes(($checkout.step === "shipping" ? "text-black" : "").trim())} data-svelte-h="svelte-uqm8cx">Shipping</span> <span class="mx-2" data-svelte-h="svelte-67ia71">&gt;</span> <span${add_classes(($checkout.step === "billing_address" ? "text-black" : "").trim())} data-svelte-h="svelte-1aajjts">Billing Address</span> <span class="mx-2" data-svelte-h="svelte-67ia71">&gt;</span> <span${add_classes(($checkout.step === "delivery" ? "text-black" : "").trim())} data-svelte-h="svelte-uh6vm1">Delivery</span> <span class="mx-2" data-svelte-h="svelte-67ia71">&gt;</span> <span${add_classes(($checkout.step === "payment" ? "text-black" : "").trim())} data-svelte-h="svelte-1pv7bd5">Payment</span></div> ${$checkout.step === "shipping" ? `<form class="space-y-4"><h2 class="text-xl font-semibold mb-4" data-svelte-h="svelte-1g51o2y">Shipping Address</h2> ${$checkout.savedShippingAddresses?.length > 0 ? `<div class="mb-6 space-y-3"><p class="font-medium text-gray-700" data-svelte-h="svelte-1n3tehw">Saved Addresses</p> ${each($checkout.savedShippingAddresses, (addr) => {
    return `<label class="flex items-start space-x-3 border p-3 rounded cursor-pointer hover:bg-gray-50"><input type="radio" name="shipping_selection"${add_attribute("value", addr.id, 0)} class="mt-1"${addr.id === selectedShippingId ? add_attribute("checked", true, 1) : ""}> <div class="text-sm"><p class="font-medium">${escape(addr.full_name)}</p> <p class="text-gray-600">${escape(addr.address_line1)}${addr.address_line2 ? `, ${escape(addr.address_line2)}` : ``}</p> <p class="text-gray-600">${escape(addr.city)}, ${escape(addr.state)} ${escape(addr.postal_code)}</p> <p class="text-gray-600">${escape(addr.country)}</p></div> </label>`;
  })} <label class="flex items-center space-x-3 border p-3 rounded cursor-pointer hover:bg-gray-50"><input type="radio" name="shipping_selection" value="new"${add_attribute("checked", true, 1)}> <span class="font-medium" data-svelte-h="svelte-ca5lqn">Enter a new address</span></label></div>` : ``} <div><label for="full_name" class="block text-sm font-medium mb-1" data-svelte-h="svelte-168817l">Full Name</label> <input id="full_name" type="text" required class="w-full border p-2 rounded" placeholder="John Doe"${add_attribute("value", shippingAddress.full_name, 0)}></div> <div><label for="phone" class="block text-sm font-medium mb-1" data-svelte-h="svelte-1uvigez">Phone Number</label> <input id="phone" type="tel" required class="w-full border p-2 rounded" placeholder="+91 9876543210"${add_attribute("value", shippingAddress.phone, 0)}></div> <div><label for="address_line1" class="block text-sm font-medium mb-1" data-svelte-h="svelte-7lai4t">Address Line 1</label> <input id="address_line1" type="text" required class="w-full border p-2 rounded"${add_attribute("value", shippingAddress.address_line1, 0)}></div> <div><label for="address_line2" class="block text-sm font-medium mb-1" data-svelte-h="svelte-19on9of">Address Line 2</label> <input id="address_line2" type="text" class="w-full border p-2 rounded"${add_attribute("value", shippingAddress.address_line2, 0)}></div> <div class="grid grid-cols-2 gap-4"><div><label for="city" class="block text-sm font-medium mb-1" data-svelte-h="svelte-sbhto">City</label> <input id="city" type="text" required class="w-full border p-2 rounded"${add_attribute("value", shippingAddress.city, 0)}></div> <div><label for="state" class="block text-sm font-medium mb-1" data-svelte-h="svelte-1t8o8sy">State</label> <input id="state" type="text" required class="w-full border p-2 rounded" placeholder="e.g. TN"${add_attribute("value", shippingAddress.state, 0)}></div></div> <div class="grid grid-cols-2 gap-4"><div><label for="postal_code" class="block text-sm font-medium mb-1" data-svelte-h="svelte-ahofrp">Postal Code</label> <input id="postal_code" type="text" required class="w-full border p-2 rounded"${add_attribute("value", shippingAddress.postal_code, 0)}></div> <div><label for="country" class="block text-sm font-medium mb-1" data-svelte-h="svelte-fd4toi">Country</label> <select id="country" class="w-full border p-2 rounded"><option value="US" data-svelte-h="svelte-1sfjp7n">United States</option></select></div> ${validate_component(Button, "Button").$$render(
    $$result,
    {
      type: "submit",
      disabled: $checkout.loading,
      ui_button_styles: "w-full bg-black text-white py-3 rounded mt-6 disabled:opacity-50"
    },
    {},
    {
      default: () => {
        return `${escape($checkout.loading ? "Saving..." : "Continue to Delivery")}`;
      }
    }
  )}</div></form>` : `${$checkout.step === "billing_address" ? `<form class="space-y-4"><h2 class="text-xl font-semibold mb-4" data-svelte-h="svelte-1cqbe6j">Billing Address</h2> <label class="flex items-center space-x-2 mb-4"><input type="checkbox" class="h-4 w-4"${add_attribute("checked", sameAsShipping, 1)}> <span data-svelte-h="svelte-w38y2">Same as shipping address</span></label> ${``} <div class="flex gap-4">${validate_component(Button, "Button").$$render(
    $$result,
    {
      type: "button",
      ui_button_styles: "w-1/3 border py-3 rounded hover:bg-gray-50"
    },
    {},
    {
      default: () => {
        return `Back`;
      }
    }
  )} ${validate_component(Button, "Button").$$render(
    $$result,
    {
      type: "submit",
      disabled: $checkout.loading,
      ui_button_styles: "w-2/3 bg-black text-white py-3 rounded disabled:opacity-50"
    },
    {},
    {
      default: () => {
        return `${escape($checkout.loading ? "Saving..." : "Continue to Delivery")}`;
      }
    }
  )}</div></form>` : `${$checkout.step === "delivery" ? `<form class="space-y-6"><h2 class="text-xl font-semibold" data-svelte-h="svelte-r621bp">Delivery Method</h2> <label class="flex items-center space-x-3 border p-4 rounded cursor-pointer hover:bg-gray-50"><input type="radio" name="delivery" value="NORMAL" class="h-4 w-4"${add_attribute("checked", true, 1)}> <div class="flex-1 flex justify-between" data-svelte-h="svelte-11no6vj"><span>Standard Delivery (5 days)</span> <span class="font-semibold">$50</span></div></label> <label class="flex items-center space-x-3 border p-4 rounded cursor-pointer hover:bg-gray-50"><input type="radio" name="delivery" value="SPEED" class="h-4 w-4"${""}> <div class="flex-1 flex justify-between" data-svelte-h="svelte-bqojw8"><span>Speed Delivery (2 days)</span> <span class="font-semibold">$120</span></div></label> <label class="flex items-center space-x-3 border p-4 rounded cursor-pointer hover:bg-gray-50"><input type="radio" name="delivery" value="EXPRESS" class="h-4 w-4"${""}> <div class="flex-1 flex justify-between" data-svelte-h="svelte-1q3l0s3"><span>Express Delivery (1 day)</span> <span class="font-semibold">$250</span></div></label> <div class="flex gap-4">${validate_component(Button, "Button").$$render(
    $$result,
    {
      type: "button",
      ui_button_styles: "w-1/3 border py-3 rounded hover:bg-gray-50"
    },
    {},
    {
      default: () => {
        return `Back`;
      }
    }
  )} ${validate_component(Button, "Button").$$render(
    $$result,
    {
      type: "submit",
      disabled: $checkout.loading,
      ui_button_styles: "w-2/3 bg-black text-white py-3 rounded disabled:opacity-50"
    },
    {},
    {
      default: () => {
        return `${escape($checkout.loading ? "Processing..." : "Continue to Payment")}`;
      }
    }
  )}</div></form>` : `${$checkout.step === "payment" ? `<div class="space-y-6"><h2 class="text-xl font-semibold" data-svelte-h="svelte-orym6u">Order Summary</h2> ${$checkout.summary ? `<div class="bg-gray-50 p-4 rounded space-y-2"><div class="flex justify-between text-gray-600"><span data-svelte-h="svelte-3vhy5m">Subtotal</span><span>${escape(currencyFormatter.format($checkout.summary.subtotal))}</span></div> <div class="flex justify-between text-gray-600"><span data-svelte-h="svelte-46xjjc">Shipping</span><span>${escape(currencyFormatter.format($checkout.summary.shipping))}</span></div> <div class="flex justify-between"><span data-svelte-h="svelte-1kt0mix">Tax</span><span>${escape(currencyFormatter.format($checkout.summary.tax))}</span></div> <div class="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span data-svelte-h="svelte-2fqrek">Total</span><span>${escape(currencyFormatter.format($checkout.summary.total))}</span></div></div>` : ``} <div class="flex gap-4">${validate_component(Button, "Button").$$render(
    $$result,
    {
      type: "button",
      ui_button_styles: "w-1/3 border py-3 rounded hover:bg-gray-50"
    },
    {},
    {
      default: () => {
        return `Back`;
      }
    }
  )} ${validate_component(Button, "Button").$$render(
    $$result,
    {
      type: "button",
      disabled: $checkout.loading,
      ui_button_styles: "w-2/3 bg-[#FFC439] text-black font-bold py-3 rounded hover:bg-[#F4BB30] disabled:opacity-50"
    },
    {},
    {
      default: () => {
        return `${escape($checkout.loading ? "Initializing..." : "Pay with PayPal")}`;
      }
    }
  )}</div></div>` : ``}`}`}`}`}</div>`;
});
export {
  Page as default
};
