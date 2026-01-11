import { jest, expect, describe, it } from '@jest/globals';
import { startSpan, withSpan } from '../../src/observability/otel.js';

describe('OTEL Observability', () => {
  describe('startSpan', () => {
    it('should return a no-op object if tracing is disabled or unavailable', () => {
      const ctx = {}; // No tracing property
      const span = startSpan(ctx, 'test.span');

      expect(span).toHaveProperty('setAttribute');
      expect(span).toHaveProperty('recordException');
      expect(span).toHaveProperty('end');

      // Ensure calling these methods does not throw errors
      expect(() => span.setAttribute('key', 'value')).not.toThrow();
      expect(() => span.recordException(new Error('test'))).not.toThrow();
      expect(() => span.end()).not.toThrow();
    });

    it('should start a span and delegate calls if tracing is enabled', () => {
      const mockInternalSpan = {
        setAttribute: jest.fn(),
        recordException: jest.fn(),
        end: jest.fn(),
      };

      const ctx = {
        tracing: {
          // Simulate the callback execution immediately
          startSpan: jest.fn((name, fn) => fn(mockInternalSpan)),
        },
      };

      const attributes = { initial: 'value' };
      const span = startSpan(ctx, 'test.span', attributes);

      // Verify startSpan was called
      expect(ctx.tracing.startSpan).toHaveBeenCalledWith('test.span', expect.any(Function));
      
      // Verify initial attributes were set
      expect(mockInternalSpan.setAttribute).toHaveBeenCalledWith('initial', 'value');

      // Verify wrapper methods delegate to internal span
      span.setAttribute('foo', 'bar');
      expect(mockInternalSpan.setAttribute).toHaveBeenCalledWith('foo', 'bar');

      const error = new Error('test error');
      span.recordException(error);
      expect(mockInternalSpan.recordException).toHaveBeenCalledWith(error);

      span.end({ final: 'attr' });
      expect(mockInternalSpan.setAttribute).toHaveBeenCalledWith('final', 'attr');
      expect(mockInternalSpan.end).toHaveBeenCalled();
    });
  });

  describe('withSpan', () => {
    it('should execute the function immediately with a dummy span if tracing is disabled', async () => {
      const ctx = {};
      const fn = jest.fn().mockReturnValue('result');

      const result = await withSpan(ctx, 'test.span', {}, fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Verify the argument passed to fn is a dummy span object
      const passedSpan = fn.mock.calls[0][0];
      expect(passedSpan).toHaveProperty('setAttribute');
      expect(passedSpan).toHaveProperty('recordException');
    });

    it('should delegate to ctx.tracing.startSpan if tracing is enabled', () => {
      const ctx = {
        tracing: {
          startSpan: jest.fn().mockImplementation((name, attrs, fn) => fn('mockSpan')),
        },
      };
      const fn = jest.fn().mockReturnValue('result');
      const attrs = { foo: 'bar' };

      const result = withSpan(ctx, 'test.span', attrs, fn);

      expect(ctx.tracing.startSpan).toHaveBeenCalledWith('test.span', attrs, fn);
      expect(result).toBe('result');
    });
  });
});