<script>
  export let href = undefined;
  export let ui_button_styles = '';

  // Forward all other props to the underlying element
  let restProps = {};
  $: ({ href, ui_button_styles, ...restProps } = $$props);

  // Forward all events
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  function handleClick(event) {
    dispatch('click', event);
  }
</script>

{#if href}
  <a class={ui_button_styles} {href} {...restProps} on:click={handleClick}>
    <slot />
  </a>
{:else}
  <button class={ui_button_styles} {...restProps} on:click={handleClick}>
    <slot />
  </button>
{/if}
