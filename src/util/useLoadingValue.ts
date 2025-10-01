import { useCallback, useMemo, useReducer } from 'react';

export type LoadingValue<T, E> = {
  error?: E;
  loading: boolean;
  reset: () => void;
  setError: (error: E) => void;
  setLoading: () => void;
  setValue: (value?: T) => void;
  value?: T;
};

type ReducerState<E> = {
  error?: E;
  loading: boolean;
  value?: any;
};

type ErrorAction<E> = { type: 'error'; error: E };
type LoadingAction = { type: 'loading' };
type ResetAction = { type: 'reset'; defaultValue?: any };
type ValueAction = { type: 'value'; value: any };
type ReducerAction<E> =
  | ErrorAction<E>
  | LoadingAction
  | ResetAction
  | ValueAction;

const defaultState = (defaultValue?: any, isInitialLoad = true) => {
  return {
    loading:
      isInitialLoad && (defaultValue === undefined || defaultValue === null),
    value: defaultValue,
  };
};

const reducer =
  <E>() =>
  (state: ReducerState<E>, action: ReducerAction<E>): ReducerState<E> => {
    switch (action.type) {
      case 'error':
        return {
          ...state,
          error: action.error,
          loading: false,
          value: undefined,
        };
      case 'loading':
        return {
          ...state,
          error: undefined,
          loading: true,
        };
      case 'reset':
        return defaultState(action.defaultValue, false);
      case 'value':
        return {
          ...state,
          error: undefined,
          loading: false,
          value: action.value,
        };
      default:
        return state;
    }
  };

const useLoadingValue = <T, E>(
  getDefaultValue?: () => T
): LoadingValue<T, E> => {
  const defaultValue = getDefaultValue ? getDefaultValue() : undefined;
  const [state, dispatch] = useReducer(
    reducer<E>(),
    defaultState(defaultValue)
  );

  const reset = useCallback(() => {
    const defaultValue = getDefaultValue ? getDefaultValue() : undefined;
    dispatch({ type: 'reset', defaultValue });
  }, [getDefaultValue]);

  const setError = useCallback((error: E) => {
    dispatch({ type: 'error', error });
  }, []);

  const setLoading = useCallback(() => {
    dispatch({ type: 'loading' });
  }, []);

  const setValue = useCallback((value?: T) => {
    dispatch({ type: 'value', value });
  }, []);

  return useMemo(
    () => ({
      error: state.error,
      loading: state.loading,
      reset,
      setError,
      setLoading,
      setValue,
      value: state.value,
    }),
    [
      state.error,
      state.loading,
      reset,
      setError,
      setLoading,
      setValue,
      state.value,
    ]
  );
};

export { useLoadingValue };
