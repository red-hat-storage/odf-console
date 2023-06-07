import { NavPage } from '@openshift-console/dynamic-plugin-sdk';
import { ResolvedCodeRefProperties } from '@openshift-console/dynamic-plugin-sdk/lib/types';
import * as _ from 'lodash-es';
import { HorizontalNavTabExtensionProps } from 'packages/odf-plugin-sdk/extensions';

export const sortPages = (
  dashboardTabs: ResolvedCodeRefProperties<HorizontalNavTabExtensionProps>[]
): void => {
  for (let i = 0; i < dashboardTabs.length; i++) {
    const element = dashboardTabs[i];
    if (_.has(element, 'before')) {
      const before = element.before;
      const placeAt = dashboardTabs.findIndex((tab) => tab.id === before);
      if (placeAt === -1) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if (placeAt === 0) {
        dashboardTabs.splice(i, 1);
        dashboardTabs.splice(0, 0, element);
      } else if (placeAt > 0) {
        dashboardTabs.splice(placeAt, 0, element);
        if (i > placeAt) {
          dashboardTabs.splice(i + 1, 1);
        } else {
          dashboardTabs.splice(i, 1);
        }
      }
    }
    if (_.has(element, 'after')) {
      const after = element.after;
      const placeAt = dashboardTabs.findIndex((tab) => tab.id === after);
      if (placeAt === -1) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if (placeAt === 0) {
        dashboardTabs.splice(i, 1);
        dashboardTabs.splice(1, 0, element);
      } else if (placeAt > 0) {
        dashboardTabs.splice(placeAt + 1, 0, element);
        if (i > placeAt) {
          dashboardTabs.splice(i + 1, 1);
        } else {
          dashboardTabs.splice(i, 1);
        }
      }
    }
  }
};

export const convertDashboardTabToNav = (
  dashboardTabs: ResolvedCodeRefProperties<HorizontalNavTabExtensionProps>[]
): NavPage[] =>
  dashboardTabs.map((tab) => ({
    name: tab.name,
    href: tab.href,
    component: tab.component,
  }));
