const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix a dual-package hazard with the Firebase JS SDK under Metro 0.84:
// by default Metro resolves `@firebase/app` (and `@firebase/component`,
// `@firebase/logger`) to BOTH their ESM build (`dist/esm/index.esm2017.js`,
// chosen via the `default` export condition for ESM importers) and their CJS
// build (`dist/index.cjs.js`, chosen via the `require` condition for CJS
// require()s) inside the same bundle. Each build keeps its own module-level
// `_apps` / `_components` registries, so `registerAuth()` called by
// `@firebase/auth` (CJS) registers into a different registry than the one
// `initializeApp()` (ESM) writes to — the auth component never reaches the
// app's container and the app crashes on launch with:
//   "Component auth has not been registered yet"
// Pinning the export conditions forces every importer onto ONE build.
// `react-native` stays first so RN-specific builds (e.g. @firebase/auth's
// dist/rn entry, which exports getReactNativePersistence) still win.
config.resolver.unstable_conditionNames = ['react-native', 'require', 'import'];

module.exports = config;
