/**
 * Unit tests for useProviderConfig hook
 */

import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProviderConfig } from '@/hooks/useProviderConfig';

describe('useProviderConfig', () => {
  interface TestConfig {
    bucket?: string;
    region?: string;
    accessKey?: string;
    secretKey?: string;
  }

  it('returns handleChange function', () => {
    const config: Partial<TestConfig> = {};
    const onChange = vi.fn();

    const { result } = renderHook(() => useProviderConfig(config, onChange));

    expect(result.current.handleChange).toBeDefined();
    expect(typeof result.current.handleChange).toBe('function');
  });

  it('calls onChange with updated config when field changes', () => {
    const config: Partial<TestConfig> = { bucket: 'old-bucket' };
    const onChange = vi.fn();

    const { result } = renderHook(() => useProviderConfig(config, onChange));

    act(() => {
      result.current.handleChange('bucket', 'new-bucket');
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      bucket: 'new-bucket',
    });
  });

  it('merges new field with existing config', () => {
    const config: Partial<TestConfig> = { bucket: 'my-bucket', region: 'us-east-1' };
    const onChange = vi.fn();

    const { result } = renderHook(() => useProviderConfig(config, onChange));

    act(() => {
      result.current.handleChange('accessKey', 'my-access-key');
    });

    expect(onChange).toHaveBeenCalledWith({
      bucket: 'my-bucket',
      region: 'us-east-1',
      accessKey: 'my-access-key',
    });
  });

  it('overwrites existing field value', () => {
    const config: Partial<TestConfig> = { bucket: 'old-bucket', region: 'us-east-1' };
    const onChange = vi.fn();

    const { result } = renderHook(() => useProviderConfig(config, onChange));

    act(() => {
      result.current.handleChange('bucket', 'new-bucket');
    });

    expect(onChange).toHaveBeenCalledWith({
      bucket: 'new-bucket',
      region: 'us-east-1',
    });
  });

  it('handles empty initial config', () => {
    const config: Partial<TestConfig> = {};
    const onChange = vi.fn();

    const { result } = renderHook(() => useProviderConfig(config, onChange));

    act(() => {
      result.current.handleChange('bucket', 'my-bucket');
    });

    expect(onChange).toHaveBeenCalledWith({
      bucket: 'my-bucket',
    });
  });

  it('handles multiple field updates', () => {
    const config: Partial<TestConfig> = {};
    const onChange = vi.fn();

    const { result } = renderHook(() => useProviderConfig(config, onChange));

    act(() => {
      result.current.handleChange('bucket', 'my-bucket');
    });

    act(() => {
      result.current.handleChange('region', 'us-west-2');
    });

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenNthCalledWith(1, { bucket: 'my-bucket' });
    expect(onChange).toHaveBeenNthCalledWith(2, { region: 'us-west-2' });
  });

  it('handles different value types', () => {
    interface ComplexConfig {
      string?: string;
      number?: number;
      boolean?: boolean;
      array?: string[];
      object?: { key: string };
    }

    const config: Partial<ComplexConfig> = {};
    const onChange = vi.fn();

    const { result } = renderHook(() => useProviderConfig<ComplexConfig>(config, onChange));

    act(() => {
      result.current.handleChange('string', 'test');
    });
    expect(onChange).toHaveBeenLastCalledWith({ string: 'test' });

    act(() => {
      result.current.handleChange('number', 42);
    });
    expect(onChange).toHaveBeenLastCalledWith({ number: 42 });

    act(() => {
      result.current.handleChange('boolean', true);
    });
    expect(onChange).toHaveBeenLastCalledWith({ boolean: true });

    act(() => {
      result.current.handleChange('array', ['a', 'b']);
    });
    expect(onChange).toHaveBeenLastCalledWith({ array: ['a', 'b'] });

    act(() => {
      result.current.handleChange('object', { key: 'value' });
    });
    expect(onChange).toHaveBeenLastCalledWith({ object: { key: 'value' } });
  });

  it('memoizes handleChange with useCallback', () => {
    const config: Partial<TestConfig> = { bucket: 'my-bucket' };
    const onChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ config, onChange }) => useProviderConfig(config, onChange),
      {
        initialProps: { config, onChange },
      }
    );

    const firstHandleChange = result.current.handleChange;

    // Rerender with same props - should return same function reference
    rerender({ config, onChange });
    expect(result.current.handleChange).toBe(firstHandleChange);
  });

  it('updates handleChange when config changes', () => {
    const onChange = vi.fn();
    let config: Partial<TestConfig> = { bucket: 'old-bucket' };

    const { result, rerender } = renderHook(
      ({ config, onChange }) => useProviderConfig(config, onChange),
      {
        initialProps: { config, onChange },
      }
    );

    const firstHandleChange = result.current.handleChange;

    // Update config
    config = { bucket: 'new-bucket' };
    rerender({ config, onChange });

    // handleChange should be a new reference since config changed
    expect(result.current.handleChange).not.toBe(firstHandleChange);
  });

  it('updates handleChange when onChange changes', () => {
    const config: Partial<TestConfig> = { bucket: 'my-bucket' };
    let onChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ config, onChange }) => useProviderConfig(config, onChange),
      {
        initialProps: { config, onChange },
      }
    );

    const firstHandleChange = result.current.handleChange;

    // Update onChange
    onChange = vi.fn();
    rerender({ config, onChange });

    // handleChange should be a new reference since onChange changed
    expect(result.current.handleChange).not.toBe(firstHandleChange);
  });

  it('handles null and undefined values', () => {
    const config: Partial<TestConfig> = { bucket: 'my-bucket' };
    const onChange = vi.fn();

    const { result } = renderHook(() => useProviderConfig(config, onChange));

    act(() => {
      result.current.handleChange('bucket', null);
    });
    expect(onChange).toHaveBeenCalledWith({ bucket: null });

    act(() => {
      result.current.handleChange('region', undefined);
    });
    expect(onChange).toHaveBeenCalledWith({ bucket: 'my-bucket', region: undefined });
  });
});
