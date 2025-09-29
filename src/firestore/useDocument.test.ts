import { addDoc, collection, doc } from 'firebase/firestore';
import { describe, expect, test } from 'vitest';

import { renderHook } from '@testing-library/react';
import { db } from '../test/firebase';
import { useDocument } from './useDocument';

describe('useDocument hook', () => {
  test('begins in loading state', async () => {
    // arrange
    const { id } = await addDoc(collection(db, 'test'), {});

    // act
    const { result, unmount } = renderHook(() =>
      useDocument(doc(collection(db, 'test'), id))
    );

    //assert
    expect(result.current[1]).toBeTruthy();

    // clean up is handled automatically
  });

  test('loads and returns data from server', async () => {
    // arrange
    const { id } = await addDoc(collection(db, 'test'), { name: 'bo' });

    // act
    const { result, rerender } = renderHook(() =>
      useDocument(doc(collection(db, 'test'), id))
    );

    // wait for loading to complete
    await new Promise((resolve) => {
      const checkLoading = () => {
        if (!result.current[1]) {
          resolve(void 0);
        } else {
          setTimeout(checkLoading, 50);
        }
      };
      checkLoading();
    });

    // assert
    expect(result.current[0]?.data()).toEqual({ name: 'bo' });

    // clean up is handled automatically
  });
});
