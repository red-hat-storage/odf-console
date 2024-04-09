import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

configure({ testIdAttribute: 'data-test-id' });

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
  withTranslation: () => () => null,
  Trans: ({ children }: any) => children,
}));

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// @TODO: delete this mock once @swc/jest can handle exported const enums.
// See: https://github.com/swc-project/swc/issues/940
enum SilenceStates {
  Active = 'active',
  Expired = 'expired',
  Pending = 'pending',
}
enum AlertSeverity {
  Critical = 'critical',
  Info = 'info',
  None = 'none',
  Warning = 'warning',
}
jest.mock('@openshift-console/dynamic-plugin-sdk/lib/api/common-types', () => ({
  ...jest.requireActual(
    '@openshift-console/dynamic-plugin-sdk/lib/api/common-types'
  ),
  AlertSeverity: AlertSeverity,
  SilenceStates: SilenceStates,
}));

// @TODO: delete this warning suppression once @patternfly/react-topology address this.
const originalConsole = global.console;
global.console = {
  ...global.console,
  warn: (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes(
        '[mobx-react-lite] importing batchingForReactDom is no longer needed'
      )
    ) {
      return true;
    }

    originalConsole.error(...args);
  },
};
