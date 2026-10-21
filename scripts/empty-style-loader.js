// Webpack loader that drops PatternFly base/component CSS from plugin bundles.
module.exports.pitch = function emptyStyleLoaderPitch() {
  return '/* PatternFly CSS is provided by OCP Console */\nmodule.exports = {};\n';
};
