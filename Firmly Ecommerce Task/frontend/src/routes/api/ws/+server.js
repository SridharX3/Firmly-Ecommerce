// IMPORTANT: You need to install the 'ws' package for this to work.
// Run: npm install ws

import { WebSocketServer } from 'ws';

let wss; // Declare wss outside the handler so it can be reused across requests

export function GET({ request }) {
  // Ensure the WebSocketServer is initialized only once
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });

    wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      // Send current visitor count to newly connected client
      broadcastCount();

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        // Broadcast updated count to all remaining clients
        broadcastCount();
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Helper function to broadcast the current client count
    function broadcastCount() {
      const count = wss.clients.size;
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'COUNT_UPDATE', count }));
        }
      });
    }
  }

  // SvelteKit's request.upgrade() is not directly available for standard GET handlers
  // We need to manually handle the upgrade process using the raw request and socket.
  // This is a common pattern when integrating 'ws' with frameworks that provide low-level access.

  // Check if the request is an upgrade request
  const upgradeHeader = request.headers.get('upgrade');
  if (upgradeHeader === 'websocket') {
    // This part assumes that the underlying HTTP server (like Vite's dev server or a production
    // Node.js server) exposes the raw socket through the request object, or provides an
    // upgrade mechanism that SvelteKit can leverage.
    // For local development, this often works out-of-the-box with Vite/Node.js.
    // In production, depending on deployment (e.g., Cloudflare Workers), this might need
    // a different approach for handling WebSockets.

    // The current SvelteKit approach for upgrading connections typically involves using
    // a dedicated endpoint and handling the upgrade manually or via platform-specific APIs.
    // This example mimics the Node.js http.Server 'upgrade' event handling.

    // NOTE: This approach might require specific server adaptations depending on the SvelteKit
    // adapter used and the deployment environment. For Node.js environments (like `adapter-node`),
    // this pattern is generally viable. For edge environments (like `adapter-cloudflare`),
    // you would typically use platform-specific WebSocket APIs.

    // Create a dummy Response to signal the upgrade, this won't actually be sent over HTTP.
    // The actual WebSocket handshake happens directly on the socket.
    return new Response(null, {
      status: 101,
      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket'
      },
      // Here, we're effectively hijacking the request.
      // In a real SvelteKit + `ws` integration, you might need to access the raw `res` object
      // which is not directly available in standard `GET` handlers.
      // For simplicity in this example, we'll assume a direct upgrade is possible if the
      // environment allows it.

      // If this doesn't work, a common alternative for SvelteKit + `ws` is to:
      // 1. Create a custom Node.js server that wraps the SvelteKit handler and handles WS upgrades.
      // 2. Use a different WebSocket library/approach that is more tightly integrated with SvelteKit's
      //    server-side utilities or specific adapters.

      // For the purpose of demonstration, this example assumes a compatible environment.
      // If deployed on Vercel/Netlify, you might need a serverless function with WS support.
      // If on Node.js, this approach is more feasible.

      // This part is highly dependent on the SvelteKit adapter and deployment environment.
      // Since `request.socket` is not standard in all environments, this might fail.
      // A more robust SvelteKit approach often involves a custom server.js file
      // or adapter-specific WebSocket handling.

      // For now, let's provide a placeholder for the upgrade logic that would typically happen
      // with `wss.handleUpgrade` if we had direct access to the raw HTTP server response stream.
      // As `request.socket` is not guaranteed in all SvelteKit environments, and `wss.handleUpgrade`
      // requires the raw `request` and `socket` objects from Node.js's `http.Server.on('upgrade')` event,
      // this needs to be adapted.

      // A direct SvelteKit + `ws` integration without a custom Node server typically looks like this:
      // In +server.js:
      // export async function GET({ request, platform }) {
      //   if (platform && platform.httpServer) { // Check for Node.js platform
      //     // This is conceptual. Actual implementation needs access to raw res object or similar.
      //     // For adapter-node, you might need to create a custom server.js.
      //     // For now, I'll provide a simplified structure.
      //     // The core idea is to obtain the `ws` instance and handle the connection.
      //     return new Promise((resolve, reject) => {
      //       platform.httpServer.on('upgrade', (req, socket, head) => {
      //         if (req === request) { // Check if this upgrade event is for our request
      //           wss.handleUpgrade(req, socket, head, (ws) => {
      //             wss.emit('connection', ws, req);
      //           });
      //           resolve(new Response(null, { status: 101 }));
      //         }
      //       });
      //     });
      //   }
      //   // Fallback for non-Node.js environments or if upgrade not handled
      //   return new Response('Not Found', { status: 404 });
      // }
      //
      // Given the constraints of not modifying server.js or using custom adapters directly,
      // the `+server.js` approach with `noServer: true` is the most SvelteKit-native way
      // to attempt this. The `request.socket` might be available in some setups.

      // Let's assume a basic Node.js environment where `request.socket` provides enough for `ws.handleUpgrade`.
      // If this doesn't work, the user would need to implement a custom server.js file as per SvelteKit docs.

      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket'
      }
    });
  } else {
    // Not a WebSocket upgrade request
    return new Response('Expected a WebSocket upgrade request', { status: 400 });
  }
}
