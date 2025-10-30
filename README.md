# @kage1020/react-firebase-hooks

A fork of react-firebase-hooks with updated bug fixes and dependencies.

A set of reusable [React Hooks](https://reactjs.org/docs/hooks-intro.html) for [Firebase](https://firebase.google.com/).

[![npm version](https://img.shields.io/npm/v/@kage1020/react-firebase-hooks.svg?style=flat-square)](https://www.npmjs.com/package/@kage1020/react-firebase-hooks)

## Installation

This package requires **React 16.8.0 or later** and **Firebase v9.0.0 or later**.

```bash
# with npm
npm install --save @kage1020/react-firebase-hooks

# with yarn
yarn add @kage1020/react-firebase-hooks

# with pnpm
pnpm add @kage1020/react-firebase-hooks
```

## Migration from react-firebase-hooks

This package is a drop-in replacement for `react-firebase-hooks`. Simply change your import:

```javascript
// Before
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';

// After
import { useAuthState } from '@kage1020/react-firebase-hooks/auth';
import { useCollection } from '@kage1020/react-firebase-hooks/firestore';
```

## Why this fork?

This library maintains the same excellent React Hooks API for Firebase while bringing modern tooling benefits:

- 🐛 **Bug fixes** and improvements over the original package
- ⚡ **Faster builds** with Vite instead of Rollup
- 🧪 **Better DX** with Vitest instead of Jest
- 📦 **Improved bundling** with optimized ESM/CJS outputs
- 🔧 **Latest dependencies** for better security and performance

## Key Differences from Original

### Null for Empty Data

All hooks in this library return `null` when data doesn't exist after fetching, instead of `undefined`. This allows you to distinguish between three states:

- **`undefined`**: Loading
- **`null`**: Successfully fetched, but no data exists or query/ref is falsy
- **`T` / `T[]`**: Data exists

**Example with Firestore:**

```typescript
const [value, loading, error] = useDocumentData(id ? docRef : null);

if (loading || value === undefined) {
  return <div>Loading...</div>;
}

if (id === undefined && value === null) {
  return <div>No document ID provided</div>;
}

if (id !== undefined && value === null) {
  return <div>Document does not exist</div>;
}

return <div>Document data: {JSON.stringify(value)}</div>;
```

**Example with Collections:**

```typescript
const [values, loading, error] = useCollectionData(id ? query : null);

if (loading || values === undefined) {
  return <div>Loading...</div>;
}

if (values === null) {
  return <div>id {id} does not exist</div>;
}

return <div>Found {values.length} documents</div>;
```

This behavior applies to data hooks across:

- Firestore (`useDocumentData`, `useCollectionData`)
- Database (`useObjectVal`, `useListVals`, `useListKeys`)
- Auth (`useAuthState`, `useIdToken`)
- Storage (`useDownloadURL`)
- Messaging (`useToken`)

## Documentation

The API remains identical to the original package:

- [Authentication Hooks](https://github.com/CSFrequency/react-firebase-hooks/tree/main/auth)
- [Cloud Firestore Hooks](https://github.com/CSFrequency/react-firebase-hooks/tree/main/firestore)
- [Cloud Functions Hooks](https://github.com/CSFrequency/react-firebase-hooks/tree/main/functions)
- [Cloud Messaging Hooks](https://github.com/CSFrequency/react-firebase-hooks/tree/main/messaging)
- [Cloud Storage Hooks](https://github.com/CSFrequency/react-firebase-hooks/tree/main/storage)
- [Realtime Database Hooks](https://github.com/CSFrequency/react-firebase-hooks/tree/main/database)

## License

- See [LICENSE](/LICENSE)
