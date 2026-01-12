

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "load": null
};
export const universal_id = "src/routes/+page.js";
export const imports = ["_app/immutable/nodes/2.CM8dnide.js","_app/immutable/chunks/C0j6wI00.js","_app/immutable/chunks/CSS4gbkW.js","_app/immutable/chunks/D6YF6ztN.js","_app/immutable/chunks/CfZhOsrX.js","_app/immutable/chunks/B6G-3GFw.js","_app/immutable/chunks/BkELfgbM.js"];
export const stylesheets = [];
export const fonts = [];
