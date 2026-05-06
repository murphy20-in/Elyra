# Elyra Mobile

> **scaffold only — not feature-complete.**
>
> This Expo + React Native app is a navigation skeleton with placeholder
> screens that wire to the same backend as the web client. Production-grade
> mobile work happens after web v1 ships.

Stack: Expo 51 + React Native 0.74 + React Navigation + Zustand + MMKV.

## Run locally

```bash
npm install
npm run start    # Expo dev server
npm run android  # Android emulator
npm run ios      # iOS simulator (macOS only)
```

The app expects the backend API at the URL configured in
`src/lib/api.ts`. Authenticated state is persisted via MMKV under the
`elyra-storage` instance.
