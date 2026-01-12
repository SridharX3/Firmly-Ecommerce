import * as universal from '../entries/pages/order/_page.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/order/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/order/+page.js";
export const imports = ["_app/immutable/nodes/6.DprE754j.js","_app/immutable/chunks/B7eymPUq.js","_app/immutable/chunks/C0j6wI00.js","_app/immutable/chunks/D6YF6ztN.js","_app/immutable/chunks/CSS4gbkW.js"];
export const stylesheets = [];
export const fonts = [];
