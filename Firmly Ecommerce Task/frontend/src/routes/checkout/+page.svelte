<script>
  import Button from "$lib/components/ui/Button.svelte";
  import { onMount } from 'svelte';
  import { loadCart } from '$lib/stores/cart';
  import { cart } from '$lib/stores/cart';
  import { 
    checkout, 
    submitShipping,
    submitBillingAddress,
    submitDelivery,
    createPayPalOrder, 
    cancelCheckout 
  } from '$lib/stores/checkout';
  
  let shippingAddress = {
    full_name: '', 
    phone: '',   
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA'
  };

  let billingAddress = {
    full_name: '', 
    phone: '',   
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA'
  };
  let sameAsShipping = true;

  let deliveryType = 'NORMAL';

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  onMount(() => {
    loadCart();
    // Reset step on mount
    checkout.update(s => ({ ...s, step: 'shipping', error: null }));
  });

  async function handleShipping() {
    try {
      await submitShipping(shippingAddress);
    } catch (e) {
      // Error is handled in store
    }
  }

  async function handleBillingAddress() {
    try {
      const addressToSubmit = sameAsShipping ? shippingAddress : billingAddress;
      await submitBillingAddress(addressToSubmit);
    } catch (e) {
      // Error is handled in store
    }
  }

  async function handleDelivery() {
    try {
      await submitDelivery(deliveryType);
    } catch (e) {
      // Error is handled in store
    }
  }

  async function handlePayment() {
    const data = await createPayPalOrder();
    if (data?.approval_url) {
      window.location.href = data.approval_url;
    }
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel checkout?')) return;
    await cancelCheckout();
    window.location.href = '/cart';
  }

  const ui_button_styles_cancel = "text-sm text-red-600 hover:underline";
  const ui_button_styles_login = "bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition";
</script>

<div class="max-w-2xl mx-auto py-10 px-4">
  <div class="flex justify-between items-center mb-8">
    <h1 class="text-3xl font-bold">Checkout</h1>
    <Button on:click={handleCancel} ui_button_styles={ui_button_styles_cancel}>Cancel & Return to Cart</Button>
  </div>

  {#if $cart.error && $cart.error.toLowerCase().includes('not logged in')}
    <div class="text-center py-12 border rounded-lg bg-gray-50">
      <h2 class="text-xl font-bold mb-4">Please Log In</h2>
      <p class="text-gray-600 mb-6">You need to be logged in to proceed with checkout.</p>
      <Button href="/login" ui_button_styles={ui_button_styles_login}>Log In</Button>
    </div>
  {:else}


  {#if $checkout.error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
      {$checkout.error}
    </div>
  {/if}

  <!-- Steps Indicator -->
  <div class="flex mb-8 text-sm font-medium text-gray-500">
    <span class:text-black={$checkout.step === 'shipping'}>Shipping</span>
    <span class="mx-2">&gt;</span>
    <span class:text-black={$checkout.step === 'billing_address'}>Billing Address</span>
    <span class="mx-2">&gt;</span>
    <span class:text-black={$checkout.step === 'delivery'}>Delivery</span>
    <span class="mx-2">&gt;</span>
    <span class:text-black={$checkout.step === 'payment'}>Payment</span>
  </div>

  {#if $checkout.step === 'shipping'}
    <form on:submit|preventDefault={handleShipping} class="space-y-4">
      <h2 class="text-xl font-semibold mb-4">Shipping Address</h2>
      
      <div>
        <label for="full_name" class="block text-sm font-medium mb-1">Full Name</label>
        <input id="full_name" type="text" required bind:value={shippingAddress.full_name} class="w-full border p-2 rounded" placeholder="John Doe" />
      </div>
      <div>
        <label for="phone" class="block text-sm font-medium mb-1">Phone Number</label>
        <input id="phone" type="tel" required bind:value={shippingAddress.phone} class="w-full border p-2 rounded" placeholder="+91 9876543210" />
      </div>
      <div>
        <label for="address_line1" class="block text-sm font-medium mb-1">Address Line 1</label>
        <input id="address_line1" type="text" required bind:value={shippingAddress.address_line1} class="w-full border p-2 rounded" />
      </div>
      <div>
        <label for="address_line2" class="block text-sm font-medium mb-1">Address Line 2</label>
        <input id="address_line2" type="text" bind:value={shippingAddress.address_line2} class="w-full border p-2 rounded" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="city" class="block text-sm font-medium mb-1">City</label>
          <input id="city" type="text" required bind:value={shippingAddress.city} class="w-full border p-2 rounded" />
        </div>
        <div>
          <label for="state" class="block text-sm font-medium mb-1">State</label>
          <input id="state" type="text" required bind:value={shippingAddress.state} class="w-full border p-2 rounded" placeholder="e.g. TN" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="postal_code" class="block text-sm font-medium mb-1">Postal Code</label>
          <input id="postal_code" type="text" required bind:value={shippingAddress.postal_code} class="w-full border p-2 rounded" />
        </div>
        <div>
          <label for="country" class="block text-sm font-medium mb-1">Country</label>
          <select id="country" bind:value={shippingAddress.country} class="w-full border p-2 rounded">
            <option value="US">United States</option>
          </select>
        </div>
      <Button type="submit" disabled={$checkout.loading} ui_button_styles={"w-full bg-black text-white py-3 rounded mt-6 disabled:opacity-50"}>
        {$checkout.loading ? 'Saving...' : 'Continue to Delivery'}
      </Button>
    </form>

  {:else if $checkout.step === 'billing_address'}
    <form on:submit|preventDefault={handleBillingAddress} class="space-y-4">
      <h2 class="text-xl font-semibold mb-4">Billing Address</h2>
      
      <label class="flex items-center space-x-2 mb-4">
        <input type="checkbox" bind:checked={sameAsShipping} class="h-4 w-4" />
        <span>Same as shipping address</span>
      </label>

      {#if !sameAsShipping}
        <div>
          <label for="billing_full_name" class="block text-sm font-medium mb-1">Full Name</label>
          <input id="billing_full_name" type="text" required bind:value={billingAddress.full_name} class="w-full border p-2 rounded" placeholder="John Doe" />
        </div>
        <div>
          <label for="billing_phone" class="block text-sm font-medium mb-1">Phone Number</label>
          <input id="billing_phone" type="tel" required bind:value={billingAddress.phone} class="w-full border p-2 rounded" placeholder="+91 9876543210" />
        </div>
        <div>
          <label for="billing_address_line1" class="block text-sm font-medium mb-1">Address Line 1</label>
          <input id="billing_address_line1" type="text" required bind:value={billingAddress.address_line1} class="w-full border p-2 rounded" />
        </div>
        <div>
          <label for="billing_address_line2" class="block text-sm font-medium mb-1">Address Line 2</label>
          <input id="billing_address_line2" type="text" bind:value={billingAddress.address_line2} class="w-full border p-2 rounded" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="billing_city" class="block text-sm font-medium mb-1">City</label>
            <input id="billing_city" type="text" required bind:value={billingAddress.city} class="w-full border p-2 rounded" />
          </div>
          <div>
            <label for="billing_state" class="block text-sm font-medium mb-1">State</label>
            <input id="billing_state" type="text" required bind:value={billingAddress.state} class="w-full border p-2 rounded" placeholder="e.g. TN" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="billing_postal_code" class="block text-sm font-medium mb-1">Postal Code</label>
            <input id="billing_postal_code" type="text" required bind:value={billingAddress.postal_code} class="w-full border p-2 rounded" />
          </div>
          <div>
            <label for="billing_country" class="block text-sm font-medium mb-1">Country</label>
            <select id="billing_country" bind:value={billingAddress.country} class="w-full border p-2 rounded">
              <option value="IN">India</option>
              <option value="US">United States</option>
            </select>
          </div>
        </div>
      {/if}

      <div class="flex gap-4">
        <Button type="button" on:click={() => checkout.update(s => ({ ...s, step: 'shipping' }))} ui_button_styles={"w-1/3 border py-3 rounded hover:bg-gray-50"}>
          Back
        </Button>
        <Button type="submit" disabled={$checkout.loading} ui_button_styles={"w-2/3 bg-black text-white py-3 rounded disabled:opacity-50"}>
          {$checkout.loading ? 'Saving...' : 'Continue to Delivery'}
        </Button>
      </div>
    </form>

  {:else if $checkout.step === 'delivery'}
    <form on:submit|preventDefault={handleDelivery} class="space-y-6">
      <h2 class="text-xl font-semibold">Delivery Method</h2>
      <label class="flex items-center space-x-3 border p-4 rounded cursor-pointer hover:bg-gray-50">
        <input type="radio" name="delivery" value="NORMAL" bind:group={deliveryType} class="h-4 w-4" />
        <div class="flex-1 flex justify-between">
          <span>Standard Delivery (5 days)</span>
          <span class="font-semibold">$50</span>
        </div>
      </label>
      <label class="flex items-center space-x-3 border p-4 rounded cursor-pointer hover:bg-gray-50">
        <input type="radio" name="delivery" value="SPEED" bind:group={deliveryType} class="h-4 w-4" />
        <div class="flex-1 flex justify-between">
          <span>Speed Delivery (2 days)</span>
          <span class="font-semibold">$120</span>
        </div>
      </label>
      <label class="flex items-center space-x-3 border p-4 rounded cursor-pointer hover:bg-gray-50">
        <input type="radio" name="delivery" value="EXPRESS" bind:group={deliveryType} class="h-4 w-4" />
        <div class="flex-1 flex justify-between">
          <span>Express Delivery (1 day)</span>
          <span class="font-semibold">$250</span>
        </div>
      </label>
      <div class="flex gap-4">
        <Button type="button" on:click={() => checkout.update(s => ({ ...s, step: 'billing_address' }))} ui_button_styles={"w-1/3 border py-3 rounded hover:bg-gray-50"}>
          Back
        </Button>
        <Button type="submit" disabled={$checkout.loading} ui_button_styles={"w-2/3 bg-black text-white py-3 rounded disabled:opacity-50"}>
          {$checkout.loading ? 'Processing...' : 'Continue to Payment'}
        </Button>
      </div>
    </form>

  {:else if $checkout.step === 'payment'}
    <div class="space-y-6">
      <h2 class="text-xl font-semibold">Order Summary</h2>
      {#if $checkout.summary}
        <div class="bg-gray-50 p-4 rounded space-y-2">
          <div class="flex justify-between text-gray-600"><span>Subtotal</span><span>{currencyFormatter.format($checkout.summary.subtotal)}</span></div>
          <div class="flex justify-between text-gray-600"><span>Shipping</span><span>{currencyFormatter.format($checkout.summary.shipping)}</span></div>
          <div class="flex justify-between"><span>Tax</span><span>{currencyFormatter.format($checkout.summary.tax)}</span></div>
          <div class="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total</span><span>{currencyFormatter.format($checkout.summary.total)}</span></div>
        </div>
      {/if}
      <div class="flex gap-4">
        <Button type="button" on:click={() => checkout.update(s => ({ ...s, step: 'delivery' }))} ui_button_styles={"w-1/3 border py-3 rounded hover:bg-gray-50"}>
          Back
        </Button>
        <Button on:click={handlePayment} disabled={$checkout.loading} ui_button_styles={"w-2/3 bg-[#FFC439] text-black font-bold py-3 rounded hover:bg-[#F4BB30] disabled:opacity-50"}>
          {$checkout.loading ? 'Initializing...' : 'Pay with PayPal'}
        </Button>
      </div>
    </div>
  {/if}
  {/if}
</div>