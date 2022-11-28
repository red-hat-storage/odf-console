import '@testing-library/jest-dom';

// Mock required window properties.
window['SERVER_FLAGS'] = {
  basePath: '/tests/',
};

jest.mock('react-i18next', () => ({
  // This mock avoids a warning being shown.
  useTranslation: () => {
    return {
      t: (str) => str,
      i18n: {
        changeLanguage: () => new Promise(() => null),
      },
    };
  },
}));
