import * as chai from 'chai';
import { getPayPalAccessToken } from '../src/utils/paypal.js';

const { expect } = chai;

describe('Utils: PayPal', () => {
  it('should return a mock access token', async () => {
    const token = await getPayPalAccessToken({});
    expect(token).to.equal('mock_access_token');
  });
});