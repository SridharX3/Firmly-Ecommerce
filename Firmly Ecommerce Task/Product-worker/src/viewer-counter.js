// /Users/sridhar/Documents/Firmly Ecommerce Task/Product-worker/src/viewer-counter.js

export class ViewerCounter {
  constructor(state, env) {
    this.state = state;
    // We keep track of all active WebSocket sessions in a Set
    this.sessions = new Set();
  }

  async fetch(request) {
    // 1. Check for WebSocket Upgrade header
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    // 2. Create a WebSocket pair (Client <-> Server)
    const { 0: client, 1: server } = new WebSocketPair();

    // 3. Handle the server side of the socket
    this.handleSession(server);

    // 4. Return the client side to the browser
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  handleSession(webSocket) {
    // Accept the connection
    webSocket.accept();
    this.sessions.add(webSocket);

    // Broadcast the new count immediately upon connection
    this.broadcast({ count: this.sessions.size });

    // Handle disconnection
    const closeOrError = () => {
      this.sessions.delete(webSocket);
      this.broadcast({ count: this.sessions.size });
    };

    webSocket.addEventListener('close', closeOrError);
    webSocket.addEventListener('error', closeOrError);
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    // Iterate over all active sessions and send the message
    for (const session of this.sessions) {
      try {
        session.send(message);
      } catch (err) {
        // If sending fails, the socket is likely dead, so remove it
        this.sessions.delete(session);
      }
    }
  }
}
