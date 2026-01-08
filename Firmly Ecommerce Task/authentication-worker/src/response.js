export function json(body, status = 200, request, extraHeaders = {}) {
  const origin = request?.headers?.get('Origin') ?? '*';

  // ✅ GUARANTEE SERIALIZABLE JSON
  let payload;

  try {
    payload =
      body instanceof Error
        ? { error: body.message }
        : typeof body === 'object'
        ? body
        : { data: body };
  } catch {
    payload = { error: 'Invalid response payload' };
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',

      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',

      ...extraHeaders
    }
  });
}
