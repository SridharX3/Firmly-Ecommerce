export async function safeJson(req) {
  try {
    return await req.json();
  } catch (e) {
    return {};
  }
}