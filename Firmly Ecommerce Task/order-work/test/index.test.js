import * as chai from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

const { expect } = chai;

describe('Worker Entry (index.js)', () => {
  let worker;
  let handleStub;

  before(async () => {
    handleStub = sinon.stub();
    const module = await esmock('../src/index.js', {
      '../src/router.js': {
        default: { handle: handleStub }
      }
    });
    worker = module.default;
  });

  it('should delegate to router', async () => {
    handleStub.resolves(new Response('ok'));
    const res = await worker.fetch(new Request('http://localhost/'), {}, {});
    expect(await res.text()).to.equal('ok');
  });

  it('should handle internal errors', async () => {
    handleStub.rejects(new Error('Boom'));
    const res = await worker.fetch(new Request('http://localhost/'), {}, {});
    expect(res.status).to.equal(500);
    const body = await res.json();
    expect(body.error).to.equal('Internal Server Error');
  });
});