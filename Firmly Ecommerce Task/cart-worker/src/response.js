export const json = (body, optionsOrStatus, reqOrHeaders, extraHeaders) => {
  let status = 200;
  let headers = {};
  let request;

  if (typeof optionsOrStatus === 'number') {
    status = optionsOrStatus;
    request = reqOrHeaders;
    headers = extraHeaders || {};
  } else {
    const options = optionsOrStatus || {};
    status = options.status || 200;
    headers = options.headers || {};
    request = options.request;
  }

  const origin = request?.headers?.get('Origin') ?? '*';

  // ✅ GUARANTEE SERIALIZABLE JSON
  let payload;

  payload =
    body instanceof Error
      ? { error: body.message }
      : typeof body === 'object'
      ? body
      : { data: body };

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',

      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',

      ...headers
    }
  });
};

export const preflight = (request) => new Response(null, {
  status: 204,
  headers: {
    'Access-Control-Allow-Origin': request?.headers?.get('Origin') ?? '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  }
});
