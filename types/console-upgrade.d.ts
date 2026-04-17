import type { ComponentType } from 'react';
import 'i18next';
import 'react-i18next';

declare module 'i18next' {
  interface CustomTypeOptions {
    allowObjectInHTMLChildren: true;
  }
}

declare module 'react-i18next' {
  export const Trans: ComponentType<any>;
}
