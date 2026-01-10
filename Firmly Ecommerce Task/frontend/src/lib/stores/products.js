import { writable } from 'svelte/store';
import { apiFetch } from '$lib/api/client';
import { PRODUCTS_API } from '$lib/api/endpoints';

function createProductsStore() {
  const { subscribe, set, update } = writable({
    loading: false,
    page: 1,
    totalPages: 1,
    total: 0,
    items: []
  });

  async function load(page = 1) {
    update(s => ({ ...s, loading: true }));

    const data = await apiFetch(`${PRODUCTS_API}/products`, {
      headers: {
        'X-Page': page
      }
    });

    set({
      loading: false,
      page: data.page,
      totalPages: data.totalPages,
      total: data.total,
      items: data.data
    });
  }

  return {
    subscribe,
    load
  };
}

export const products = createProductsStore();
