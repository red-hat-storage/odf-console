import { NavPage } from '@openshift-console/dynamic-plugin-sdk';
import { ResolvedCodeRefProperties } from '@openshift-console/dynamic-plugin-sdk/lib/types';
import { DashboardTabExtensionProps } from 'packages/odf-plugin-sdk/extensions';

enum HealthState {
  OK = 'OK',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  LOADING = 'LOADING',
  UNKNOWN = 'UNKNOWN',
  UPDATING = 'UPDATING',
  PROGRESS = 'PROGRESS',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
}

type SubsystemHealth = {
  message?: string;
  state: HealthState;
};

export const getOperatorHealthState = (
  state: string,
  loading,
  loadError
): SubsystemHealth => {
  if (loading) {
    return { state: HealthState.LOADING };
  }
  if (loadError) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  if (state === 'Succeeded') {
    return { state: HealthState.OK };
  }
  return { state: HealthState.ERROR };
};

export const convertDashboardTabToNav = (
  dashboardTabs: ResolvedCodeRefProperties<DashboardTabExtensionProps>[]
): NavPage[] =>
  dashboardTabs.map((tab) => ({
    name: tab.name,
    href: tab.href,
    component: tab.component,
  }));
