module.exports = {
  createOldCatalogs: false,
  keySeparator: false,
  locales: ['en'],
  namespaceSeparator: '~',
  reactNamespace: false,
  defaultValue: function (_locale, _namespace, key, _value) {
    // The `useKeysAsDefaultValues` option is deprecated in favor of `defaultValue` option function arguments.
    // The `key` is used to set default value.
    return key;
  },
  defaultNamespace: 'plugin__odf-console',
  sort: (a, b) => {
    return a.localeCompare(b, 'en');
  },
};
