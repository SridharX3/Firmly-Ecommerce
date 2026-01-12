import { c as create_ssr_component, i as createEventDispatcher, j as spread, k as escape_attribute_value, l as escape_object } from "./ssr.js";
const Button = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { href = void 0 } = $$props;
  let { ui_button_styles = "" } = $$props;
  let restProps = {};
  createEventDispatcher();
  if ($$props.href === void 0 && $$bindings.href && href !== void 0) $$bindings.href(href);
  if ($$props.ui_button_styles === void 0 && $$bindings.ui_button_styles && ui_button_styles !== void 0) $$bindings.ui_button_styles(ui_button_styles);
  ({ href, ui_button_styles, ...restProps } = $$props);
  return `${href ? `<a${spread(
    [
      {
        class: escape_attribute_value(ui_button_styles)
      },
      { href: escape_attribute_value(href) },
      escape_object(restProps)
    ],
    {}
  )}>${slots.default ? slots.default({}) : ``}</a>` : `<button${spread(
    [
      {
        class: escape_attribute_value(ui_button_styles)
      },
      escape_object(restProps)
    ],
    {}
  )}>${slots.default ? slots.default({}) : ``}</button>`}`;
});
export {
  Button as B
};
