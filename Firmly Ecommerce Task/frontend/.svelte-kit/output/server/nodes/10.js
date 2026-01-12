

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/products/_id_/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "load": null
};
export const universal_id = "src/routes/products/[id]/+page.js";
export const imports = ["_app/immutable/nodes/10.Dwr_6hZf.js","_app/immutable/chunks/B7eymPUq.js","_app/immutable/chunks/C0j6wI00.js","_app/immutable/chunks/CSS4gbkW.js","_app/immutable/chunks/D6YF6ztN.js","_app/immutable/chunks/CfZhOsrX.js","_app/immutable/chunks/BGipdwkA.js","_app/immutable/chunks/BkELfgbM.js"];
export const stylesheets = [];
export const fonts = [];
