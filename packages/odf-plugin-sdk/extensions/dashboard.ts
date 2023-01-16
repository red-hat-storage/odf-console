import * as React from 'react';
import {
  CodeRef,
  Extension,
  ExtensionDeclaration,
} from '@openshift-console/dynamic-plugin-sdk/lib/types';
import { RouteComponentProps } from 'react-router';

export type DashboardTabExtensionProps = {
  /** Unique string to identify the tab */
  id: string;
  /** Name of the tab */
  name: string;
  /** ID of the tab before which this should be placed */
  before?: string;
  /** ID of the tab after which this should be placecd */
  after?: string;
  /** Href to be assigned to the tab */
  href: string;
  /** Component to be mounted */
  component: CodeRef<React.ComponentType<RouteComponentProps>>;
};

export type DashboardTab = ExtensionDeclaration<
  'odf.dashboard/tab',
  DashboardTabExtensionProps
>;

export const isDashboardTab = (e: Extension): e is DashboardTab =>
  e.type === 'odf.dashboard/tab';
