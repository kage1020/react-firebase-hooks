import { describe, expect, test } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoadingValue } from './useLoadingValue';

describe('useLoadingValue synchronization fix', () => {
  test('starts with loading=true when no defaultValue provided', () => {
    const { result } = renderHook(() => useLoadingValue<string, Error>());

    expect(result.current.loading).toBe(true);
    expect(result.current.value).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  test('starts with loading=false when defaultValue provided', () => {
    const { result } = renderHook(() =>
      useLoadingValue<string, Error>(() => 'default')
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.value).toBe('default');
    expect(result.current.error).toBeUndefined();
  });

  test('setLoading sets loading=true and clears error', () => {
    const { result } = renderHook(() => useLoadingValue<string, Error>());

    // First set an error
    act(() => {
      result.current.setError(new Error('test error'));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(new Error('test error'));

    // Then set loading
    act(() => {
      result.current.setLoading();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeUndefined();
    expect(result.current.value).toBeUndefined();
  });

  test('setValue sets value and loading=false', () => {
    const { result } = renderHook(() => useLoadingValue<string, Error>());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.value).toBeUndefined();

    // Set value
    act(() => {
      result.current.setValue('test value');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.value).toBe('test value');
    expect(result.current.error).toBeUndefined();
  });

  test('proper loading->setValue sequence maintains synchronization', () => {
    const { result } = renderHook(() => useLoadingValue<string, Error>());

    // Start loading
    expect(result.current.loading).toBe(true);
    expect(result.current.value).toBeUndefined();

    // Call setLoading (simulating async operation start)
    act(() => {
      result.current.setLoading();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.value).toBeUndefined();

    // Call setValue (simulating async operation completion)
    act(() => {
      result.current.setValue('async result');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.value).toBe('async result');
  });

  test('reset with defaultValue sets loading=false', () => {
    const { result } = renderHook(() => useLoadingValue<string, Error>());

    // Set some state first
    act(() => {
      result.current.setValue('some value');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.value).toBe('some value');

    // Reset with default value (should not be loading since it's not initial load)
    act(() => {
      result.current.reset();
    });

    expect(result.current.loading).toBe(false); // false because isInitialLoad=false in reset
    expect(result.current.value).toBeUndefined();
  });
});
