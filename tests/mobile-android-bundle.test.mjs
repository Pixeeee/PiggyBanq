import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';

test('Metro reads Android image assets by file path', async () => {
  const mobileRequire = createRequire(resolve('apps/mobile/package.json'));
  const expoRequire = createRequire(mobileRequire.resolve('expo/package.json'));
  const metroRequire = createRequire(expoRequire.resolve('@expo/metro-config/package.json'));
  const { getAssetData } = metroRequire('metro/private/Assets');
  const image = resolve('apps/mobile/assets/piggy_icon.png');
  const asset = await getAssetData(image, dirname(image), [], 'android', '/assets');
  assert.ok(asset.width > 0);
  assert.ok(asset.height > 0);
  assert.equal(asset.type, 'png');
});

test('React Native Android codegen discovers native components', () => {
  const mobileRequire = createRequire(resolve('apps/mobile/package.json'));
  const reactNativeRequire = createRequire(mobileRequire.resolve('react-native/package.json'));
  const codegenRoot = dirname(reactNativeRequire.resolve('@react-native/codegen/package.json'));
  const { combineSchemasInFileList } = reactNativeRequire(
    resolve(codegenRoot, 'lib/cli/combine/combine-js-to-schema.js')
  );
  const safeAreaRoot = dirname(mobileRequire.resolve('react-native-safe-area-context/package.json'));
  const schema = combineSchemasInFileList([resolve(safeAreaRoot, 'src')], 'android');
  assert.ok(Object.keys(schema.modules).length > 0);
});
