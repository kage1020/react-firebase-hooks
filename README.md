# @kage1020/react-firebase-hooks

A fork of react-firebase-hooks with updated tooling and dependencies.

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

- ⚡ **Faster builds** with Vite instead of Rollup
- 🧪 **Better DX** with Vitest instead of Jest
- 📦 **Improved bundling** with optimized ESM/CJS outputs
- 🔧 **Latest dependencies** for better security and performance

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
