const ssr = false;
async function load({ fetch, url }) {
  const page = Number(url.searchParams.get("page") ?? 1);
  const searchId = url.searchParams.get("product_id");
  let res;
  let json;
  if (searchId) {
    res = await fetch(
      `https://products-worker.sridhar-89c.workers.dev/products/${searchId}`
    );
    json = await res.json();
    return {
      products: [json],
      page: 1,
      totalPages: 1,
      searchId
    };
  }
  res = await fetch(
    `https://products-worker.sridhar-89c.workers.dev/products`,
    {
      headers: {
        "X-Page": String(page)
      }
    }
  );
  json = await res.json();
  return {
    products: json.data,
    page: json.page,
    totalPages: json.totalPages,
    searchId: null
  };
}
export {
  load,
  ssr
};
