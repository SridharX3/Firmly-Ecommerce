import { get } from 'svelte/store';
import { session } from '$lib/stores/session';
import { goto } from '$app/navigation';

export function requireAuth() {
  const { user, loading } = get(session);

  if (!loading && !user) {
    goto('/login');
  }
}
