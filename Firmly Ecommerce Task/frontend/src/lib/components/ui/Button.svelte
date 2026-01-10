<script lang="ts">
  export let href: string | undefined = undefined;
  export let ui_button_styles: string = '';

  // Forward all other props to the underlying element
  let restProps: Record<string, any> = {};
  $: ({ href, ui_button_styles, ...restProps } = $$props);

  // Forward all events
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  function handleClick(event: MouseEvent) {
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
