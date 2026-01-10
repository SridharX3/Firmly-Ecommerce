
import { expect } from 'chai';
import sinon from 'sinon';
import { log } from '../../src/utils/logger.js';
import { trace } from '@opentelemetry/api';

describe('Logger Util', () => {
  let consoleLogStub;
  let getActiveSpanStub;

  beforeEach(() => {
    consoleLogStub = sinon.stub(console, 'log');
    getActiveSpanStub = sinon.stub(trace, 'getActiveSpan');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should log a message with level and extra data', () => {
    getActiveSpanStub.returns(undefined); // No active span
    log('info', 'User logged in', { userId: 123 });
    
    expect(consoleLogStub.calledOnce).to.be.true;
    const logArgs = JSON.parse(consoleLogStub.firstCall.args[0]);
    
    expect(logArgs).to.deep.include({
      level: 'info',
      message: 'User logged in',
      userId: 123,
    });
  });

  it('should include trace_id if an active span exists', () => {
    const mockSpan = {
      spanContext: () => ({
        traceId: 'mock-trace-id',
      }),
    };
    getActiveSpanStub.returns(mockSpan);

    log('error', 'Failed to process payment');

    expect(consoleLogStub.calledOnce).to.be.true;
    const logArgs = JSON.parse(consoleLogStub.firstCall.args[0]);

    expect(logArgs).to.deep.include({
      level: 'error',
      message: 'Failed to process payment',
      trace_id: 'mock-trace-id',
    });
  });

  it('should not fail if extra is not provided', () => {
    getActiveSpanStub.returns(undefined);
    expect(() => log('warn', 'Disk space is low')).to.not.throw();
    expect(consoleLogStub.calledOnce).to.be.true;
    const logArgs = JSON.parse(consoleLogStub.firstCall.args[0]);
    expect(logArgs).to.deep.equal({
      level: 'warn',
      message: 'Disk space is low'
    });
  });
});
