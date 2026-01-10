let promise;

export function loadPayPal(clientId) {
  if (!clientId) {
    throw new Error('PayPal client ID missing');
  }

  if (promise) return promise;

  promise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser'));
      return;
    }

    if (window.paypal) {
      resolve(window.paypal);
      return;
    }

    const script = document.createElement('script');
    script.src =
      'https://www.paypal.com/sdk/js' +
      `?client-id=${clientId}` +
      '&currency=USD' +
      '&intent=capture';

    script.async = true;

    script.onload = () => {
      if (!window.paypal) {
        reject(new Error('PayPal SDK loaded but paypal is undefined'));
        return;
      }
      resolve(window.paypal);
    };

    script.onerror = () =>
      reject(new Error('PayPal SDK failed to load'));

    document.head.appendChild(script);
  });

  return promise;
}
