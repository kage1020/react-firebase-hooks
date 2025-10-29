export { useLoadingValue } from './useLoadingValue';
export * from './refHooks';

export type LoadingHook<T, E> = [T | null | undefined, boolean, E | undefined];
