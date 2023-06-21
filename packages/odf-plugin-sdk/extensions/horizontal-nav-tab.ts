import * as React from 'react';
import {
  CodeRef,
  Extension,
  ExtensionDeclaration,
} from '@openshift-console/dynamic-plugin-sdk/lib/types';
import { RouteComponentProps } from 'react-router';

export type HorizontalNavTabExtensionProps = {
  /** Unique string to identify the tab */
  id: string;
  /** Name of the tab */
  name: string;
  /** Context ID according to which tab will be injected to a particular page. */
  contextId: string;
  /** ID of the tab before which this should be placed */
  before?: string;
  /** ID of the tab after which this should be placecd */
  after?: string;
  /** Href to be assigned to the tab */
  href: string;
  /** Component to be mounted */
  component: CodeRef<React.ComponentType<RouteComponentProps>>;
};

export type HorizontalNavTab = ExtensionDeclaration<
  'odf.horizontalNav/tab',
  HorizontalNavTabExtensionProps
>;

export const isHorizontalNavTab = (e: Extension): e is HorizontalNavTab =>
  e?.type === 'odf.horizontalNav/tab';
