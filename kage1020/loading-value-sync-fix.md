# Loading/Value Synchronization Fix Implementation Log

## Issue Description
useDocumentとuseDocumentOnceでvalueとloadingの同期が取れていない問題がありました．具体的には，初回レンダリング時にloadingがfalseになったにも関わらずvalueがundefinedのままであり，次のレンダリングのタイミングでvalueが更新されるという問題でした。

## Root Cause Analysis
問題の根本原因は`useLoadingValue`にありました：

1. **初期状態の問題**: `defaultState`関数で、`defaultValue`が`undefined`の場合に`loading: true`に設定されていたが、この判定が不適切でした
2. **非同期処理開始の問題**: `useDocument`と`useDocumentOnce`で非同期処理が開始された時点で`loading`状態を適切に管理する仕組みがありませんでした

## Implementation Changes

### 1. useLoadingValue.ts の修正

#### 新しいアクションタイプの追加
```typescript
type LoadingAction = { type: 'loading' };
```

#### LoadingValue型の拡張
```typescript
export type LoadingValue<T, E> = {
  error?: E;
  loading: boolean;
  reset: () => void;
  setError: (error: E) => void;
  setLoading: () => void;  // 新規追加
  setValue: (value?: T) => void;
  value?: T;
};
```

#### defaultState関数の改良
```typescript
const defaultState = (defaultValue?: any, isInitialLoad = true) => {
  return {
    loading: isInitialLoad && (defaultValue === undefined || defaultValue === null),
    value: defaultValue,
  };
};
```
- `isInitialLoad`パラメータを追加して、初期ロードかリセットかを区別
- リセット時は`loading: false`になるように調整

#### reducer関数の拡張
```typescript
case 'loading':
  return {
    ...state,
    error: undefined,
    loading: true,
  };
```
- 新しい`loading`アクションを追加
- `setLoading()`で明示的にloading状態を設定可能に

### 2. useDocument.ts の修正

#### useDocument関数の改良
```typescript
const { error, loading, reset, setError, setLoading, setValue, value } = useLoadingValue<
  DocumentSnapshot<T>,
  FirestoreError
>();

useEffect(() => {
  if (!ref.current) {
    setValue(undefined);
    return;
  }
  
  setLoading();  // 非同期処理開始前にloadingを設定
  const unsubscribe = options?.snapshotListenOptions
    ? onSnapshot(/* ... */)
    : onSnapshot(/* ... */);
  
  return () => {
    unsubscribe();
  };
}, [ref.current, setLoading, setValue, setError]);
```

#### useDocumentOnce関数の改良
```typescript
const loadData = useCallback(
  async (reference?: DocumentReference<T> | null, options?: OnceOptions) => {
    if (!reference) {
      setValue(undefined);
      return;
    }
    
    setLoading();  // 非同期処理開始前にloadingを設定
    const get = getDocFnFromGetOptions(options?.getOptions);

    try {
      const result = await get(reference);
      if (isMounted) {
        setValue(result);
      }
    } catch (error) {
      if (isMounted) {
        setError(error as FirestoreError);
      }
    }
  },
  [isMounted, setLoading, setValue, setError]
);
```

### 3. prettier.config.js の修正
ESM対応のため、`module.exports`を`export default`に変更しました。

## Testing
新しいテストファイル`useLoadingValue.test.ts`を作成し、以下をテスト：

1. **初期状態テスト**: `defaultValue`なしの場合は`loading: true`
2. **デフォルト値テスト**: `defaultValue`ありの場合は`loading: false`
3. **setLoadingテスト**: `setLoading()`が正しく動作することを確認
4. **setValueテスト**: `setValue()`で`loading: false`になることを確認
5. **同期テスト**: `setLoading()` → `setValue()`の順序で正しく同期することを確認

## Results
- ✅ `useLoadingValue`の同期問題を根本的に解決
- ✅ `useDocument`と`useDocumentOnce`で非同期処理開始時に正しく`loading: true`が設定される
- ✅ データ取得完了時に`loading: false`と`value`が同期して更新される
- ✅ 6つのテストケースがすべて通過

## Impact
この修正により：
- 初回レンダリング時のloading/value同期問題が解決
- ユーザーエクスペリエンスが改善（ローディング状態の正確な表示）
- 非同期処理のライフサイクルがより明確に管理される

## Files Modified
- `src/util/useLoadingValue.ts` - 根本的な修正
- `src/firestore/useDocument.ts` - setLoading()の追加
- `src/util/useLoadingValue.test.ts` - 新規テストファイル
- `src/firestore/useDocument.sync.test.ts` - 統合テストファイル（Firebase依存のため未完成）
- `prettier.config.js` - ESM対応

## Date
2025-09-29