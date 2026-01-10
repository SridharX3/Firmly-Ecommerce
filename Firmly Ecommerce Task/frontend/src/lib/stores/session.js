import { writable } from 'svelte/store';
import { apiFetch } from '$lib/api/client';
import { AUTH_API } from '$lib/api/endpoints';

export const session = writable({
  loading: true,
  user: null
});

/* =========================
   LOAD SESSION (ON APP LOAD)
========================= */
export async function loadSession() {
  try {
    const data = await apiFetch(`${AUTH_API}/session`);

    session.set({
      loading: false,
      user: data.session
    });
  } catch {
    session.set({
      loading: false,
      user: null
    });
  }
}

/* =========================
   LOGIN
========================= */
export async function login(payload) {
  const user = await apiFetch(`${AUTH_API}/auth/login`, {
    method: 'POST',
    body: payload
  });

  session.set({
    loading: false,
    user
  });

  return user;
}

/* =========================
   REGISTER
========================= */
export async function register(payload) {
  const user = await apiFetch(`${AUTH_API}/auth/register`, {
    method: 'POST',
    body: payload
  });

  session.set({
    loading: false,
    user
  });

  return user;
}

/* =========================
   LOGOUT
========================= */
export async function logout() {
  await apiFetch(`${AUTH_API}/auth/logout`, {
    method: 'POST'
  });

  session.set({
    loading: false,
    user: null
  });
}
