const { override, adjustStyleLoaders } = require('customize-cra');

module.exports = override(
  // Set sourceType: 'module' for babel-loader on .js/.jsx
  (config) => {
    const babelRule = config.module.rules.find(rule => 
      rule.oneOf && rule.oneOf.some(one => one.loader && one.loader.includes('babel-loader'))
    );
    if (babelRule && babelRule.oneOf) {
      babelRule.oneOf.forEach(one => {
        if (one.loader && one.loader.includes('babel-loader') && one.options) {
          one.options.sourceType = 'module';
        }
      });
    }
    return config;
  },
  // Bonus: Fix any CSS modules if needed
  adjustStyleLoaders(rule => {
    if (!rule) return;
    rule.use = rule.use.map(loader => {
      if (loader.loader && loader.loader.includes('css-loader')) {
        return { ...loader, options: { ...loader.options, modules: true } };
      }
      return loader;
    });
  })
);