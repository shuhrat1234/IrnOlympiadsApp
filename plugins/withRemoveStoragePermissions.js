const { withAndroidManifest } = require('@expo/config-plugins');
const { ensureToolsAvailable } = require('@expo/config-plugins/build/android/Manifest');

module.exports = function withRemoveStoragePermissions(config) {
  return withAndroidManifest(config, async (config) => {
    config.modResults = ensureToolsAvailable(config.modResults);
    const androidManifest = config.modResults;
    const permissionsToRemove = [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ];

    if (!Array.isArray(androidManifest.manifest['uses-permission'])) {
      androidManifest.manifest['uses-permission'] = [];
    }

    // Filter out if added previously
    androidManifest.manifest['uses-permission'] = androidManifest.manifest['uses-permission'].filter(
      (item) => !permissionsToRemove.includes(item.$?.['android:name'])
    );

    // Explicitly add with tools:node="remove" so Gradle manifest merger removes them from third-party libraries
    permissionsToRemove.forEach((permission) => {
      androidManifest.manifest['uses-permission'].push({
        $: {
          'android:name': permission,
          'tools:node': 'remove',
        },
      });
    });

    if (!Array.isArray(androidManifest.manifest['uses-feature'])) {
      androidManifest.manifest['uses-feature'] = [];
    }
    // Set screen.portrait to not required so app is available across all Android form factors
    androidManifest.manifest['uses-feature'] = androidManifest.manifest['uses-feature'].filter(
      (item) => item.$?.['android:name'] !== 'android.hardware.screen.portrait'
    );
    androidManifest.manifest['uses-feature'].push({
      $: {
        'android:name': 'android.hardware.screen.portrait',
        'android:required': 'false',
      },
    });

    return config;
  });
};
