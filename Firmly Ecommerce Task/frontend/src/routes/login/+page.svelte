<script>
  import { goto } from '$app/navigation';
  import { session } from '$lib/stores/session';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function login() {
    error = '';
    loading = true;

    try {
      const res = await fetch(
        'https://auth-worker.sridhar-89c.workers.dev/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include', // ✅ REQUIRED FOR COOKIE
          body: JSON.stringify({
            email,
            password
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      session.set({
        user: data,
        loading: false
      });

      goto('/');
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<h1 class="text-2xl font-bold mb-6">Login</h1>

{#if error}
  <p class="mb-4 text-red-600">{error}</p>
{/if}

<form on:submit|preventDefault={login} class="space-y-4">
  <input
    type="email"
    placeholder="Email"
    bind:value={email}
    class="border p-2 rounded w-full"
    required
  />

  <input
    type="password"
    placeholder="Password"
    bind:value={password}
    class="border p-2 rounded w-full"
    required
  />

  <button
    class="bg-black text-white px-4 py-2 rounded w-full disabled:opacity-50"
    disabled={loading}
  >
    {loading ? 'Logging in…' : 'Login'}
  </button>

  <a href="/register" class="block w-full text-center border border-black px-4 py-2 rounded hover:bg-gray-50">
    Register
  </a>
</form>
