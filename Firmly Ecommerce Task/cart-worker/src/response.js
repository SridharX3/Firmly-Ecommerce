export const corsHeaders = (request) => ({
  'Access-Control-Allow-Origin': request?.headers?.get('Origin') ?? '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Vary': 'Origin'
});

export const json = (body, status = 200, request) => {
  const payload = body instanceof Error 
    ? { error: body.message } 
    : (body ?? { error: 'Invalid response payload' });

  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) }
  });
};

export const preflight = (request) => new Response(null, {
  status: 204,
  headers: corsHeaders(request)
});
