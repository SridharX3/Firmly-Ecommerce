<script>
  import { register } from '$lib/stores/session';
  import { goto } from '$app/navigation';

  let email = '';
  let username = '';
  let phone_number = '';
  let password = '';
  let confirm_password = '';
  let error = '';
  let loading = false;

  async function submit() {
    error = '';
    loading = true;

    try {
      if (password !== confirm_password) {
        throw new Error('Passwords do not match');
      }

      await register({ email, password, confirm_password, username, phone_number });
      goto('/');
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<h2 class="text-2xl font-bold mb-4">Register</h2>

<form on:submit|preventDefault={submit} class="space-y-4">
  <input class="w-full border p-2 rounded" placeholder="Username" bind:value={username} />
  <input class="w-full border p-2 rounded" placeholder="Email" bind:value={email} />
  <input class="w-full border p-2 rounded" placeholder="Phone Number" bind:value={phone_number} />
  <input type="password" class="w-full border p-2 rounded" placeholder="Password" bind:value={password} />
  <input type="password" class="w-full border p-2 rounded" placeholder="Confirm Password" bind:value={confirm_password} />

  {#if error}
    <p class="text-red-600">{error}</p>
  {/if}

  <button class="w-full bg-black text-white p-2 rounded" disabled={loading}>
    {loading ? 'Creating...' : 'Create account'}
  </button>
</form>
