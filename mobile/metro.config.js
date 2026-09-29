const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;
// When building via B:\ subst drive, node_modules physically live at D:\ long path.
// Adding both paths lets Metro compute SHA-1 regardless of which drive Gradle runs from.
const longPathRoot = 'D:\\Togethertech Projects\\booshnam\\Booshnam-construction-software\\mobile';

const config = {
  watchFolders: [
    projectRoot,
    longPathRoot,
  ],
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
