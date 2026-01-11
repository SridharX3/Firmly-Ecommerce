import { expect } from 'chai';
import sinon from 'sinon';
import { startSpan, withSpan } from '../src/observability/otel.js';

describe('Observability: OTEL', () => {
  let ctx;
  let spanStub;

  beforeEach(() => {
    spanStub = {
      setAttribute: sinon.spy(),
      recordException: sinon.spy(),
      end: sinon.spy(),
    };
    ctx = {
      tracing: {
        startSpan: sinon.stub().callsFake((name, opts, fn) => {
          // Handle both signatures: (name, fn) or (name, attrs, fn)
          if (typeof opts === 'function') {
            opts(spanStub);
          } else if (typeof fn === 'function') {
            return fn(spanStub);
          }
        }),
      },
    };
  });

  describe('startSpan', () => {
    it('should return dummy object if tracing is disabled', () => {
      const span = startSpan({}, 'test');
      expect(span.setAttribute).to.be.a('function');
      span.setAttribute('a', 'b'); // Should not throw
      span.recordException(new Error('test')); // Should not throw
      span.end(); // Should not throw
    });

    it('should start a span if tracing is enabled', () => {
      const span = startSpan(ctx, 'test', { foo: 'bar' });
      expect(ctx.tracing.startSpan.calledWith('test')).to.be.true;
      expect(spanStub.setAttribute.calledWith('foo', 'bar')).to.be.true;
      
      span.setAttribute('key', 'val');
      expect(spanStub.setAttribute.calledWith('key', 'val')).to.be.true;

      span.end({ extra: 'attr' });
      expect(spanStub.end.called).to.be.true;

      span.recordException(new Error('test'));
      expect(spanStub.recordException.called).to.be.true;
    });

    it('should handle missing span in proxy methods', () => {
      // Mock startSpan to NOT call the callback
      ctx.tracing.startSpan = sinon.stub(); 
      
      const span = startSpan(ctx, 'test');
      
      // These should not throw even if span is undefined
      span.setAttribute('a', 'b');
      span.recordException(new Error('test'));
      span.end();
      
      expect(ctx.tracing.startSpan.called).to.be.true;
    });
  });

  describe('withSpan', () => {
    it('should run function directly if tracing is disabled', async () => {
      const result = await withSpan({}, 'test', {}, () => 'result');
      expect(result).to.equal('result');
    });

    it('should use ctx.tracing.startSpan if enabled', async () => {
      const fn = sinon.stub().returns('result');
      const result = await withSpan(ctx, 'test', { a: 1 }, fn);
      
      expect(ctx.tracing.startSpan.called).to.be.true;
      expect(result).to.equal('result');
    });
  });
});