import { w as writable } from "./index.js";
const cart = writable({
  items: [],
  subtotal: 0,
  currency: "USD",
  loading: false,
  error: null
});
export {
  cart as c
};
