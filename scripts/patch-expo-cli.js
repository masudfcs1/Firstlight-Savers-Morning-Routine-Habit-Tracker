const fs = require('fs');
const path = require('path');

const polyfillCode = `if (typeof URL !== 'undefined' && !URL.parse) {
  URL.parse = function(url, base) {
    try {
      return new URL(url, base);
    } catch {
      return null;
    }
  };
}
`;

const projectRoot = path.resolve(__dirname, '..');
const filesToPatch = [
  path.join(projectRoot, 'node_modules/expo/bin/cli'),
  path.join(projectRoot, 'node_modules/expo/node_modules/@expo/cli/bin/cli.js'),
  path.join(projectRoot, 'node_modules/expo/node_modules/@expo/cli/build/src/index.js'),
  path.join(projectRoot, 'node_modules/expo/node_modules/@expo/cli/build/src/start/server/middleware/ExpoMiddleware.js'),
  path.join(projectRoot, 'node_modules/expo/node_modules/@expo/cli/build/src/start/server/metro/dev-server/createMessageSocket.js'),
  path.join(projectRoot, 'node_modules/expo/node_modules/@expo/cli/build/src/start/server/middleware/resolvePlatform.js'),
  path.join(projectRoot, 'node_modules/expo/node_modules/@expo/cli/build/src/start/server/middleware/RuntimeRedirectMiddleware.js'),
  path.join(projectRoot, 'node_modules/expo/node_modules/@expo/cli/build/src/start/server/middleware/ServeStaticMiddleware.js'),
];

for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('URL.parse = function')) {
      if (content.startsWith('#!/usr/bin/env node')) {
        content = content.replace('#!/usr/bin/env node', '#!/usr/bin/env node\n' + polyfillCode);
      } else {
        content = polyfillCode + content;
      }
      fs.writeFileSync(file, content, 'utf8');
      console.log(`[patch-expo-cli] Patched ${path.relative(projectRoot, file)}`);
    } else {
      console.log(`[patch-expo-cli] Already patched: ${path.relative(projectRoot, file)}`);
    }
  }
}
