import { describe, expect, test, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDocument, useDocumentOnce } from './useDocument';
import type { DocumentReference, DocumentSnapshot } from 'firebase/firestore';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  onSnapshot: vi.fn(),
  getDoc: vi.fn(),
}));

describe('useDocument loading/value synchronization', () => {
  test('useDocument starts with loading=true and value=undefined', async () => {
    const { onSnapshot } = await import('firebase/firestore');
    const mockRef = {} as DocumentReference;
    const mockSnapshot = { data: () => ({ test: 'data' }) } as DocumentSnapshot;

    // Mock onSnapshot to call setValue with data after a delay
    vi.mocked(onSnapshot).mockImplementation((ref, callback) => {
      setTimeout(() => {
        (callback as (snapshot: DocumentSnapshot) => void)(mockSnapshot);
      }, 100);
      return () => {};
    });

    const { result } = renderHook(() => useDocument(mockRef));

    // Initially should be loading with no value
    expect(result.current[1]).toBe(true); // loading
    expect(result.current[0]).toBeUndefined(); // value

    // Wait for the async update
    await waitFor(() => {
      expect(result.current[1]).toBe(false); // loading should be false
      expect(result.current[0]).toBe(mockSnapshot); // value should be set
    });
  });

  test('useDocumentOnce starts with loading=true and value=undefined', async () => {
    const { getDoc } = await import('firebase/firestore');
    const mockRef = {} as DocumentReference;
    const mockSnapshot = { data: () => ({ test: 'data' }) } as DocumentSnapshot;

    // Mock getDoc to resolve with data after a delay
    vi.mocked(getDoc).mockResolvedValue(mockSnapshot);

    const { result } = renderHook(() => useDocumentOnce(mockRef));

    // Initially should be loading with no value
    expect(result.current[1]).toBe(true); // loading
    expect(result.current[0]).toBeUndefined(); // value

    // Wait for the async update
    await waitFor(() => {
      expect(result.current[1]).toBe(false); // loading should be false
      expect(result.current[0]).toBe(mockSnapshot); // value should be set
    });
  });

  test('useDocument maintains loading=true until setValue is called', async () => {
    const { onSnapshot } = await import('firebase/firestore');
    const mockRef = {} as DocumentReference;
    let capturedCallback: ((snapshot: DocumentSnapshot) => void) | null = null;

    // Capture the callback but don't call it immediately
    vi.mocked(onSnapshot).mockImplementation((ref, callback) => {
      capturedCallback = callback as (snapshot: DocumentSnapshot) => void;
      return () => {};
    });

    const { result } = renderHook(() => useDocument(mockRef));

    // Should start and remain loading
    expect(result.current[1]).toBe(true);
    expect(result.current[0]).toBeUndefined();

    // Even after a brief wait, should still be loading since callback hasn't been called
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current[1]).toBe(true);
    expect(result.current[0]).toBeUndefined();

    // Now call the callback to simulate data arrival
    const mockSnapshot = { data: () => ({ test: 'data' }) } as DocumentSnapshot;
    capturedCallback?.(mockSnapshot);

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
      expect(result.current[0]).toBe(mockSnapshot);
    });
  });
});
