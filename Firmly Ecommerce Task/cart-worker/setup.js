// Polyfill for Response object in Node.js environment
if (!globalThis.Response) {
  globalThis.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = new Map(Object.entries(init.headers || {}));
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
  };
}