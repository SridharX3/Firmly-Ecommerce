import { w as writable } from "./index.js";
const loadState = () => {
  if (typeof localStorage === "undefined") return null;
  try {
    const stored = localStorage.getItem("checkout_state");
    if (!stored) return null;
    const state = JSON.parse(stored);
    return { ...state, loading: false, error: null };
  } catch (e) {
    return null;
  }
};
const checkout = writable(loadState() || {
  loading: false,
  error: null,
  step: "shipping",
  summary: null,
  checkoutId: null,
  savedShippingAddresses: [],
  savedBillingAddresses: []
});
checkout.subscribe((state) => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("checkout_state", JSON.stringify(state));
  }
});
export {
  checkout as c
};
