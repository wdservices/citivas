const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix a dual-package hazard with the Firebase JS SDK under Metro 0.84:
// Metro auto-adds `import` for ESM importers and `require` for CJS require()s,
// but without these base conditions an ESM importer of `@firebase/app` fell
// through to the `default` export condition (ESM build) while a CJS require()
// resolved the `require` condition (CJS build) — bundling BOTH builds in one
// bundle. Each build keeps its own module-level `_apps` / `_components`
// registries, so `registerAuth()` called by `@firebase/auth` (CJS) registered
// into a different registry than the one `initializeApp()` (ESM) wrote to —
// the auth component never reached the app's container and the app crashed on
// launch with: "Component auth has not been registered yet".
// Listing both conditions in the BASE set makes every importer resolve the
// same way (single build per platform).
// NOTE: do NOT put `react-native` here — it would win on web too and load the
// RN entry of @firebase/auth (no signInWithPopup). Metro adds `react-native`
// per-platform via unstable_conditionsByPlatform for android/ios only.
config.resolver.unstable_conditionNames = ['require', 'import'];

module.exports = config;
