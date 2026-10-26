/**
 * Google Play flags `android:statusBarColor` and `android:navigationBarColor`
 * as deprecated (Android 15 edge-to-edge migration). Expo's core SystemBars
 * mod writes them unconditionally into styles.xml during prebuild, so this
 * plugin runs afterwards and strips them. Runtime window insets are handled
 * natively by React Native's `edgeToEdgeEnabled` support.
 */
const { withAndroidStyles } = require('@expo/config-plugins');

const DEPRECATED_ITEMS = ['android:statusBarColor', 'android:navigationBarColor'];

module.exports = function withRemoveDeprecatedSystemBarColors(config) {
  return withAndroidStyles(config, (modConfig) => {
    const styleGroups = modConfig.modResults?.resources?.style ?? [];
    for (const styleGroup of styleGroups) {
      if (Array.isArray(styleGroup.item)) {
        styleGroup.item = styleGroup.item.filter(
          (item) => !DEPRECATED_ITEMS.includes(item?.$?.name)
        );
      }
    }
    return modConfig;
  });
};
