import { act, renderHook, waitFor } from '@testing-library/react';
import {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FirestoreError,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  onSnapshot,
} from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentHook } from './types';
import {
  useDocument,
  useDocumentData,
  useDocumentDataOnce,
  useDocumentOnce,
} from './useDocument';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocFromCache: vi.fn(),
  getDocFromServer: vi.fn(),
  onSnapshot: vi.fn(),
  refEqual: vi.fn((ref1, ref2) => ref1 === ref2),
  queryEqual: vi.fn((q1, q2) => q1 === q2),
}));

describe('useDocument', () => {
  let mockDocRef: DocumentReference;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocRef = { id: 'test-doc' } as unknown as DocumentReference;
    mockUnsubscribe = vi.fn();
  });

  describe('DocumentReference monitoring', () => {
    it('starts real-time monitoring with onSnapshot when valid DocumentReference is provided', () => {
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      const { result } = renderHook(() => useDocument(mockDocRef));

      expect(onSnapshot).toHaveBeenCalledWith(
        mockDocRef,
        expect.any(Function),
        expect.any(Function)
      );
      expect(result.current[1]).toBe(true); // loading
    });

    it('returns new DocumentSnapshot when document is updated', async () => {
      const mockSnapshot = {
        exists: () => true,
        data: () => ({ name: 'test' }),
      } as unknown as DocumentSnapshot;

      vi.mocked(onSnapshot).mockImplementation((ref, onNext: any) => {
        setTimeout(() => onNext(mockSnapshot), 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useDocument(mockDocRef));

      await waitFor(() => {
        expect(result.current[0]).toBe(mockSnapshot);
        expect(result.current[1]).toBe(false); // not loading
      });
    });

    it('returns snapshot with exists() false when document is deleted', async () => {
      const mockSnapshot = {
        exists: () => false,
      } as DocumentSnapshot;

      vi.mocked(onSnapshot).mockImplementation((ref, onNext: any) => {
        setTimeout(() => onNext(mockSnapshot), 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useDocument(mockDocRef));

      await waitFor(() => {
        expect(result.current[0]?.exists()).toBe(false);
      });
    });
  });

  describe('reference change handling', () => {
    it('stops monitoring and sets value to undefined when DocumentReference changes to null', async () => {
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      const { result, rerender } = renderHook<
        DocumentHook<DocumentData>,
        { ref: DocumentReference<DocumentData> | null }
      >(({ ref }) => useDocument(ref), {
        initialProps: { ref: mockDocRef },
      });

      rerender({ ref: null });

      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
        expect(result.current[0]).toBeUndefined();
      });
    });

    it('stops previous monitoring and starts new monitoring when DocumentReference changes', async () => {
      const newMockDocRef = { id: 'new-doc' } as any;
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(({ ref }) => useDocument(ref), {
        initialProps: { ref: mockDocRef },
      });

      expect(onSnapshot).toHaveBeenCalledTimes(1);

      rerender({ ref: newMockDocRef });

      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
        expect(onSnapshot).toHaveBeenCalledTimes(2);
      });
    });

    it('does not create duplicate monitoring when same DocumentReference is provided again', () => {
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(() => useDocument(mockDocRef));

      expect(onSnapshot).toHaveBeenCalledTimes(1);

      rerender();

      expect(onSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  describe('snapshotListenOptions', () => {
    it('applies includeMetadataChanges option', () => {
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      renderHook(() =>
        useDocument(mockDocRef, {
          snapshotListenOptions: { includeMetadataChanges: true },
        })
      );

      expect(onSnapshot).toHaveBeenCalledWith(
        mockDocRef,
        { includeMetadataChanges: true },
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('applies source option', () => {
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      renderHook(() =>
        useDocument(mockDocRef, {
          snapshotListenOptions: { source: 'cache' },
        })
      );

      expect(onSnapshot).toHaveBeenCalledWith(
        mockDocRef,
        { source: 'cache' },
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('error handling', () => {
    it('returns FirestoreError on permission error', async () => {
      const mockError = new Error('Permission denied') as FirestoreError;

      vi.mocked(onSnapshot).mockImplementation(
        (ref, onNext: any, onError: any) => {
          setTimeout(() => onError(mockError), 0);
          return mockUnsubscribe;
        }
      );

      const { result } = renderHook(() => useDocument(mockDocRef));

      await waitFor(() => {
        expect(result.current[2]).toBe(mockError);
        expect(result.current[1]).toBe(false);
      });
    });

    it('returns appropriate error on network error', async () => {
      const mockError = new Error('Network error') as FirestoreError;

      vi.mocked(onSnapshot).mockImplementation(
        (ref, onNext: any, onError: any) => {
          setTimeout(() => onError(mockError), 0);
          return mockUnsubscribe;
        }
      );

      const { result } = renderHook(() => useDocument(mockDocRef));

      await waitFor(() => {
        expect(result.current[2]).toBe(mockError);
      });
    });

    it('enters error state on invalid reference error', async () => {
      const mockError = new Error('Invalid reference') as FirestoreError;

      vi.mocked(onSnapshot).mockImplementation(
        (ref, onNext: any, onError: any) => {
          setTimeout(() => onError(mockError), 0);
          return mockUnsubscribe;
        }
      );

      const { result } = renderHook(() => useDocument(mockDocRef));

      await waitFor(() => {
        expect(result.current[2]).toBe(mockError);
        expect(result.current[1]).toBe(false);
      });
    });
  });

  describe('cleanup', () => {
    it('properly unsubscribes previous listener when useEffect dependencies change', async () => {
      const newMockDocRef = { id: 'new-doc' } as any;
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(({ ref }) => useDocument(ref), {
        initialProps: { ref: mockDocRef },
      });

      rerender({ ref: newMockDocRef });

      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
    });

    it('unsubscribes listener on component unmount', () => {
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useDocument(mockDocRef));

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});

describe('useDocumentOnce', () => {
  let mockDocRef: DocumentReference;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocRef = { id: 'test-doc' } as any;
  });

  describe('one-time fetch', () => {
    it('fetches once using getDoc when DocumentReference is provided', async () => {
      const mockSnapshot = {
        exists: () => true,
        data: () => ({ name: 'test' }),
      } as unknown as DocumentSnapshot;

      vi.mocked(getDoc).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useDocumentOnce(mockDocRef));

      expect(result.current[1]).toBe(true); // loading

      await waitFor(() => {
        expect(getDoc).toHaveBeenCalledWith(mockDocRef);
        expect(result.current[0]).toBe(mockSnapshot);
        expect(result.current[1]).toBe(false);
      });
    });

    it('returns undefined without fetching when DocumentReference is null', () => {
      const { result } = renderHook(() => useDocumentOnce(null));

      expect(getDoc).not.toHaveBeenCalled();
      expect(result.current[0]).toBeUndefined();
      expect(result.current[1]).toBe(false);
    });

    it('fetches data with new reference when reference changes', async () => {
      const mockSnapshot1 = { id: 'doc1' } as DocumentSnapshot;
      const mockSnapshot2 = { id: 'doc2' } as DocumentSnapshot;
      const newMockDocRef = { id: 'new-doc' } as any;

      vi.mocked(getDoc)
        .mockResolvedValueOnce(mockSnapshot1)
        .mockResolvedValueOnce(mockSnapshot2);

      const { result, rerender } = renderHook(
        ({ ref }) => useDocumentOnce(ref),
        { initialProps: { ref: mockDocRef } }
      );

      await waitFor(() => {
        expect(result.current[0]).toBe(mockSnapshot1);
      });

      rerender({ ref: newMockDocRef });

      await waitFor(() => {
        expect(getDoc).toHaveBeenCalledTimes(2);
        expect(result.current[0]).toBe(mockSnapshot2);
      });
    });
  });

  describe('getOptions source specification', () => {
    it('uses getDoc when source is "default"', async () => {
      const mockSnapshot = {} as DocumentSnapshot;
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot);

      renderHook(() =>
        useDocumentOnce(mockDocRef, { getOptions: { source: 'default' } })
      );

      await waitFor(() => {
        expect(getDoc).toHaveBeenCalledWith(mockDocRef);
      });
    });

    it('uses getDocFromCache when source is "cache"', async () => {
      const mockSnapshot = {} as DocumentSnapshot;
      vi.mocked(getDocFromCache).mockResolvedValue(mockSnapshot);

      renderHook(() =>
        useDocumentOnce(mockDocRef, { getOptions: { source: 'cache' } })
      );

      await waitFor(() => {
        expect(getDocFromCache).toHaveBeenCalledWith(mockDocRef);
      });
    });

    it('uses getDocFromServer when source is "server"', async () => {
      const mockSnapshot = {} as DocumentSnapshot;
      vi.mocked(getDocFromServer).mockResolvedValue(mockSnapshot);

      renderHook(() =>
        useDocumentOnce(mockDocRef, { getOptions: { source: 'server' } })
      );

      await waitFor(() => {
        expect(getDocFromServer).toHaveBeenCalledWith(mockDocRef);
      });
    });
  });

  describe('reloadData function', () => {
    it('fetches data with current reference when reloadData is called', async () => {
      const mockSnapshot1 = { id: 'doc1' } as DocumentSnapshot;
      const mockSnapshot2 = { id: 'doc2' } as DocumentSnapshot;

      vi.mocked(getDoc)
        .mockResolvedValueOnce(mockSnapshot1)
        .mockResolvedValueOnce(mockSnapshot2);

      const { result } = renderHook(() => useDocumentOnce(mockDocRef));

      await waitFor(() => {
        expect(result.current[0]).toBe(mockSnapshot1);
      });

      act(() => {
        result.current[3](); // reloadData
      });

      await waitFor(() => {
        expect(getDoc).toHaveBeenCalledTimes(2);
        expect(result.current[0]).toBe(mockSnapshot2);
      });
    });

    it('enters loading state when reloadData is called', async () => {
      const mockSnapshot = {} as DocumentSnapshot;
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useDocumentOnce(mockDocRef));

      await waitFor(() => {
        expect(result.current[1]).toBe(false);
      });

      act(() => {
        result.current[3](); // reloadData
      });

      expect(result.current[1]).toBe(true);
    });

    it('does nothing when reloadData is called with null reference', async () => {
      const { result } = renderHook(() => useDocumentOnce(null));

      act(() => {
        result.current[3](); // reloadData
      });

      expect(getDoc).not.toHaveBeenCalled();
      expect(result.current[0]).toBeUndefined();
    });
  });

  describe('mount state management', () => {
    it('does not call setValue after component unmount', async () => {
      const mockSnapshot = {} as DocumentSnapshot;
      let resolveGetDoc: (value: DocumentSnapshot) => void;
      const getDocPromise = new Promise<DocumentSnapshot>((resolve) => {
        resolveGetDoc = resolve;
      });
      vi.mocked(getDoc).mockReturnValue(getDocPromise);

      const { result, unmount } = renderHook(() => useDocumentOnce(mockDocRef));

      unmount();

      resolveGetDoc!(mockSnapshot);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(result.current[0]).toBeUndefined();
    });

    it('does not call setError after component unmount', async () => {
      const mockError = new Error('Test error') as FirestoreError;
      let rejectGetDoc: (error: Error) => void;
      const getDocPromise = new Promise<DocumentSnapshot>((_, reject) => {
        rejectGetDoc = reject;
      });
      vi.mocked(getDoc).mockReturnValue(getDocPromise);

      const { result, unmount } = renderHook(() => useDocumentOnce(mockDocRef));

      unmount();

      rejectGetDoc!(mockError);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(result.current[2]).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('returns FirestoreError when getDoc fails', async () => {
      const mockError = new Error('Fetch failed') as FirestoreError;
      vi.mocked(getDoc).mockRejectedValue(mockError);

      const { result } = renderHook(() => useDocumentOnce(mockDocRef));

      await waitFor(() => {
        expect(result.current[2]).toBe(mockError);
        expect(result.current[1]).toBe(false);
      });
    });

    it('does not set error when component is not mounted', async () => {
      const mockError = new Error('Test error') as FirestoreError;
      let rejectGetDoc: (error: Error) => void;
      const getDocPromise = new Promise<DocumentSnapshot>((_, reject) => {
        rejectGetDoc = reject;
      });
      vi.mocked(getDoc).mockReturnValue(getDocPromise);

      const { result, unmount } = renderHook(() => useDocumentOnce(mockDocRef));

      unmount();

      rejectGetDoc!(mockError);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(result.current[2]).toBeUndefined();
    });
  });
});

describe('useDocumentData', () => {
  let mockDocRef: DocumentReference;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocRef = { id: 'test-doc' } as any;
    mockUnsubscribe = vi.fn();
  });

  describe('data extraction', () => {
    it('extracts data from DocumentSnapshot using data() method', async () => {
      const mockData = { name: 'test', value: 123 };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockData,
      } as unknown as DocumentSnapshot;

      vi.mocked(onSnapshot).mockImplementation((_ref, onNext: any) => {
        setTimeout(() => onNext(mockSnapshot), 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useDocumentData(mockDocRef));

      await waitFor(() => {
        expect(result.current[0]).toEqual(mockData);
        expect(result.current[3]).toBe(mockSnapshot);
      });
    });

    it('returns undefined when document does not exist', async () => {
      const mockSnapshot = {
        exists: () => false,
        data: () => undefined,
      } as unknown as DocumentSnapshot;

      vi.mocked(onSnapshot).mockImplementation((_ref, onNext: any) => {
        setTimeout(() => onNext(mockSnapshot), 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useDocumentData(mockDocRef));

      await waitFor(() => {
        expect(result.current[0]).toBeUndefined();
      });
    });

    it('returns both DocumentSnapshot and data', async () => {
      const mockData = { name: 'test' };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockData,
      } as unknown as DocumentSnapshot;

      vi.mocked(onSnapshot).mockImplementation((_ref, onNext: any) => {
        setTimeout(() => onNext(mockSnapshot), 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useDocumentData(mockDocRef));

      await waitFor(() => {
        expect(result.current[0]).toEqual(mockData);
        expect(result.current[3]).toBe(mockSnapshot);
      });
    });
  });

  describe('snapshotOptions application', () => {
    it('applies serverTimestamps option', async () => {
      const mockData = { name: 'test' };
      const mockDataFn = vi.fn(() => mockData);
      const mockSnapshot = {
        exists: () => true,
        data: mockDataFn,
      } as unknown as DocumentSnapshot;

      vi.mocked(onSnapshot).mockImplementation((_ref, onNext: any) => {
        setTimeout(() => onNext(mockSnapshot), 0);
        return mockUnsubscribe;
      });

      renderHook(() =>
        useDocumentData(mockDocRef, {
          snapshotOptions: { serverTimestamps: 'estimate' },
        })
      );

      await waitFor(() => {
        expect(mockDataFn).toHaveBeenCalledWith({
          serverTimestamps: 'estimate',
        });
      });
    });

    it('applies custom snapshotOptions', async () => {
      const mockData = { name: 'test' };
      const mockDataFn = vi.fn(() => mockData);
      const mockSnapshot = {
        exists: () => true,
        data: mockDataFn,
      } as unknown as DocumentSnapshot;

      vi.mocked(onSnapshot).mockImplementation((_ref, onNext: any) => {
        setTimeout(() => onNext(mockSnapshot), 0);
        return mockUnsubscribe;
      });

      renderHook(() =>
        useDocumentData(mockDocRef, {
          snapshotOptions: { serverTimestamps: 'previous' },
        })
      );

      await waitFor(() => {
        expect(mockDataFn).toHaveBeenCalledWith({
          serverTimestamps: 'previous',
        });
      });
    });
  });

  describe('initialValue handling', () => {
    it('returns initialValue when data does not exist', async () => {
      const initialValue = { name: 'initial' };
      const mockSnapshot = {
        exists: () => false,
        data: () => undefined,
      } as unknown as DocumentSnapshot;

      vi.mocked(onSnapshot).mockImplementation((_ref, onNext: any) => {
        setTimeout(() => onNext(mockSnapshot), 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() =>
        useDocumentData(mockDocRef, { initialValue })
      );

      await waitFor(() => {
        expect(result.current[0]).toEqual(initialValue);
      });
    });

    it('prioritizes actual data over initialValue when data exists', async () => {
      const initialValue = { name: 'initial' };
      const actualData = { name: 'actual' };
      const mockSnapshot = {
        exists: () => true,
        data: () => actualData,
      } as unknown as DocumentSnapshot;

      vi.mocked(onSnapshot).mockImplementation((_ref, onNext: any) => {
        setTimeout(() => onNext(mockSnapshot), 0);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() =>
        useDocumentData(mockDocRef, { initialValue })
      );

      await waitFor(() => {
        expect(result.current[0]).toEqual(actualData);
      });
    });

    it('returns initialValue when snapshot is undefined', () => {
      const initialValue = { name: 'initial' };
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      const { result } = renderHook(() =>
        useDocumentData(null, { initialValue })
      );

      expect(result.current[0]).toEqual(initialValue);
    });
  });

  describe('useDocument integration', () => {
    it('inherits loading state from useDocument', () => {
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      const { result } = renderHook(() => useDocumentData(mockDocRef));

      expect(result.current[1]).toBe(true); // loading
    });

    it('inherits error state from useDocument', async () => {
      const mockError = new Error('Test error') as FirestoreError;

      vi.mocked(onSnapshot).mockImplementation(
        (_ref, _onNext: any, onError: any) => {
          setTimeout(() => onError(mockError), 0);
          return mockUnsubscribe;
        }
      );

      const { result } = renderHook(() => useDocumentData(mockDocRef));

      await waitFor(() => {
        expect(result.current[2]).toBe(mockError);
      });
    });

    it('correctly passes options to useDocument', () => {
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      renderHook(() =>
        useDocumentData(mockDocRef, {
          snapshotListenOptions: { includeMetadataChanges: true },
        })
      );

      expect(onSnapshot).toHaveBeenCalledWith(
        mockDocRef,
        { includeMetadataChanges: true },
        expect.any(Function),
        expect.any(Function)
      );
    });
  });
});

describe('useDocumentDataOnce', () => {
  let mockDocRef: DocumentReference;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocRef = { id: 'test-doc' } as any;
  });

  describe('data extraction and one-time fetch combination', () => {
    it('extracts data from snapshot returned by useDocumentOnce', async () => {
      const mockData = { name: 'test', value: 123 };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockData,
      } as unknown as DocumentSnapshot;

      vi.mocked(getDoc).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useDocumentDataOnce(mockDocRef));

      await waitFor(() => {
        expect(result.current[0]).toEqual(mockData);
        expect(result.current[3]).toBe(mockSnapshot);
      });
    });

    it('returns data, loading, error, snapshot, and reloadData', async () => {
      const mockData = { name: 'test' };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockData,
      } as unknown as DocumentSnapshot;

      vi.mocked(getDoc).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useDocumentDataOnce(mockDocRef));

      expect(result.current).toHaveLength(5);

      await waitFor(() => {
        expect(result.current[0]).toEqual(mockData); // data
        expect(result.current[1]).toBe(false); // loading
        expect(result.current[2]).toBeUndefined(); // error
        expect(result.current[3]).toBe(mockSnapshot); // snapshot
        expect(typeof result.current[4]).toBe('function'); // reloadData
      });
    });

    it('fetches and extracts new data when reloadData is called', async () => {
      const mockData1 = { name: 'test1' };
      const mockData2 = { name: 'test2' };
      const mockSnapshot1 = {
        exists: () => true,
        data: () => mockData1,
      } as unknown as DocumentSnapshot;
      const mockSnapshot2 = {
        exists: () => true,
        data: () => mockData2,
      } as unknown as DocumentSnapshot;

      vi.mocked(getDoc)
        .mockResolvedValueOnce(mockSnapshot1)
        .mockResolvedValueOnce(mockSnapshot2);

      const { result } = renderHook(() => useDocumentDataOnce(mockDocRef));

      await waitFor(() => {
        expect(result.current[0]).toEqual(mockData1);
      });

      act(() => {
        result.current[4](); // reloadData
      });

      await waitFor(() => {
        expect(result.current[0]).toEqual(mockData2);
      });
    });
  });

  describe('initialValue combination', () => {
    it('returns initialValue when document does not exist', async () => {
      const initialValue = { name: 'initial' };
      const mockSnapshot = {
        exists: () => false,
        data: () => undefined,
      } as unknown as DocumentSnapshot;

      vi.mocked(getDoc).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() =>
        useDocumentDataOnce(mockDocRef, { initialValue })
      );

      await waitFor(() => {
        expect(result.current[0]).toEqual(initialValue);
      });
    });

    it('prioritizes fetched data over initialValue when data exists', async () => {
      const initialValue = { name: 'initial' };
      const actualData = { name: 'actual' };
      const mockSnapshot = {
        exists: () => true,
        data: () => actualData,
      } as unknown as DocumentSnapshot;

      vi.mocked(getDoc).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() =>
        useDocumentDataOnce(mockDocRef, { initialValue })
      );

      await waitFor(() => {
        expect(result.current[0]).toEqual(actualData);
      });
    });
  });

  describe('options integration', () => {
    it('applies both OnceDataOptions and InitialValueOptions', async () => {
      const initialValue = { name: 'initial' };
      const mockSnapshot = {
        exists: () => false,
        data: () => undefined,
      } as unknown as DocumentSnapshot;

      vi.mocked(getDocFromCache).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() =>
        useDocumentDataOnce(mockDocRef, {
          getOptions: { source: 'cache' },
          initialValue,
        })
      );

      await waitFor(() => {
        expect(getDocFromCache).toHaveBeenCalledWith(mockDocRef);
        expect(result.current[0]).toEqual(initialValue);
      });
    });

    it('correctly applies snapshotOptions', async () => {
      const mockData = { name: 'test' };
      const mockDataFn = vi.fn(() => mockData);
      const mockSnapshot = {
        exists: () => true,
        data: mockDataFn,
      } as unknown as DocumentSnapshot;

      vi.mocked(getDoc).mockResolvedValue(mockSnapshot);

      renderHook(() =>
        useDocumentDataOnce(mockDocRef, {
          snapshotOptions: { serverTimestamps: 'estimate' },
        })
      );

      await waitFor(() => {
        expect(mockDataFn).toHaveBeenCalledWith({
          serverTimestamps: 'estimate',
        });
      });
    });

    it('correctly applies getOptions', async () => {
      const mockSnapshot = {
        exists: () => true,
        data: () => ({ name: 'test' }),
      } as unknown as DocumentSnapshot;

      vi.mocked(getDocFromServer).mockResolvedValue(mockSnapshot);

      renderHook(() =>
        useDocumentDataOnce(mockDocRef, {
          getOptions: { source: 'server' },
        })
      );

      await waitFor(() => {
        expect(getDocFromServer).toHaveBeenCalledWith(mockDocRef);
      });
    });
  });
});
