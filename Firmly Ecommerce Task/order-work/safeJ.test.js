import * as chai from 'chai';
import { safeJson } from '../../src/utils/safeJ.js';

const { expect } = chai;

describe('Utils: safeJson', () => {
  it('should parse valid JSON', async () => {
    const req = {
      json: async () => ({ foo: 'bar' })
    };
    const result = await safeJson(req);
    expect(result).to.deep.equal({ foo: 'bar' });
  });

  it('should return empty object on error', async () => {
    const req = {
      json: async () => { throw new Error('Invalid JSON'); }
    };
    const result = await safeJson(req);
    expect(result).to.deep.equal({});
  });
});