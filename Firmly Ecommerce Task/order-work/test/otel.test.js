import * as chai from 'chai';
import sinon from 'sinon';
import { startSpan, withSpan, setAttributes } from '../src/observability/otel.js';

const { expect } = chai;

describe('Observability: OTEL', () => {
  describe('startSpan', () => {
    it('should return dummy object if tracing disabled', () => {
      const span = startSpan({}, 'test');
      expect(span.setAttribute).to.be.a('function');
      expect(span.end).to.be.a('function');
      span.setAttribute('a', 1); // Should not throw
    });

    it('should start span if tracing enabled', () => {
      const mockSpan = { setAttribute: sinon.spy(), end: sinon.spy(), recordException: sinon.spy() };
      const ctx = {
        tracing: {
          startSpan: sinon.stub().callsFake((name, fn) => fn(mockSpan))
        }
      };

      const spanWrapper = startSpan(ctx, 'test', { foo: 'bar' });
      
      expect(ctx.tracing.startSpan.calledWith('test')).to.be.true;
      expect(mockSpan.setAttribute.calledWith('foo', 'bar')).to.be.true;

      spanWrapper.setAttribute('key', 'val');
      expect(mockSpan.setAttribute.calledWith('key', 'val')).to.be.true;

      spanWrapper.end({ extra: 1 });
      expect(mockSpan.setAttribute.calledWith('extra', 1)).to.be.true;
      expect(mockSpan.end.called).to.be.true;
    });
  });

  describe('withSpan', () => {
    it('should execute function directly if tracing disabled', async () => {
      const fn = sinon.stub().returns('result');
      const res = await withSpan({}, 'test', {}, fn);
      expect(res).to.equal('result');
      expect(fn.called).to.be.true;
    });

    it('should use ctx.tracing.startSpan if available', async () => {
      const ctx = {
        tracing: {
          startSpan: sinon.stub().callsFake((name, attrs, fn) => fn({}))
        }
      };
      const fn = sinon.stub().returns('result');
      
      const res = await withSpan(ctx, 'test', { a: 1 }, fn);
      
      expect(res).to.equal('result');
      expect(ctx.tracing.startSpan.calledWith('test', { a: 1 })).to.be.true;
    });
  });

  describe('setAttributes', () => {
    it('should set multiple attributes on span', () => {
      const span = { setAttribute: sinon.spy() };
      setAttributes(span, { a: 1, b: 2 });
      expect(span.setAttribute.calledWith('a', 1)).to.be.true;
      expect(span.setAttribute.calledWith('b', 2)).to.be.true;
    });
  });
});