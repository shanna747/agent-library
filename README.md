# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Firebase setup

This app can save data to Firebase Realtime Database using the built-in REST sync logic.

1. Create a Firebase project and Realtime Database.
2. Open `src/PramataAgentLibrary.jsx` and make sure the `FIREBASE_DB_URL` points to your RTDB URL.
3. Alternatively, create a local environment file and add:

```env
VITE_FIREBASE_DB_URL=https://<PROJECT_ID>.firebaseio.com
VITE_FIREBASE_DB_PATH=
```

4. Restart the dev server after changing the `.env` file.
5. Run the app with `npm run dev`.

If `VITE_FIREBASE_DB_URL` is not set, the app uses the default shared Firebase endpoint and falls back to local storage.
