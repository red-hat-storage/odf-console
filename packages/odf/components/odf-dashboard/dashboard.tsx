import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux';
import {
  HorizontalNavTab,
  isHorizontalNavTab,
} from '@odf/odf-plugin-sdk/extensions';
import { StatusBox } from '@odf/shared/generic';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  HorizontalNav,
  useResolvedExtensions,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Extension,
  ExtensionTypeGuard,
} from '@openshift-console/dynamic-plugin-sdk/lib/types';
import * as _ from 'lodash-es';
import { Helmet } from 'react-helmet';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { Grid, GridItem } from '@patternfly/react-core';
import {
  HorizontalNavProps as DashboardTabProps,
  convertHorizontalNavTabToNavPage as convertDashboardTabToNav,
  useSortPages,
} from '../../utils';
import { StorageSystemListPage } from '../system-list/odf-system-list';
import ActivityCard from './activity-card/activity-card';
import ObjectCapacityCard from './object-storage-card/capacity-card';
import PerformanceCard from './performance-card/performance-card';
import { StatusCard } from './status-card/status-card';
import SystemCapacityCard from './system-capacity-card/capacity-card';
import './dashboard.scss';

const ODF_DASHBOARD_CONTEXT = 'odf-dashboard';

const UpperSection: React.FC = () => (
  <Grid hasGutter>
    <GridItem md={8} sm={12}>
      <StatusCard />
    </GridItem>
    <GridItem md={4} rowSpan={2} sm={12}>
      <ActivityCard />
    </GridItem>
    <GridItem md={4} sm={12}>
      <SystemCapacityCard />
    </GridItem>
    <GridItem md={4} sm={12}>
      <ObjectCapacityCard />
    </GridItem>
    <GridItem md={12} sm={12}>
      <PerformanceCard />
    </GridItem>
  </Grid>
);

const isDashboardTab = (e: Extension) =>
  isHorizontalNavTab(e) && e.properties.contextId === ODF_DASHBOARD_CONTEXT;

export const ODFDashboard: React.FC = () => {
  return (
    <>
      <div className="odf-dashboard-body">
        <UpperSection />
      </div>
    </>
  );
};

const ODFDashboardPage: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const title = t('Data Foundation');
  const staticPages: DashboardTabProps[] = React.useMemo(
    () => [
      {
        id: 'overview',
        href: '',
        name: t('Overview'),
        component: ODFDashboard,
        contextId: ODF_DASHBOARD_CONTEXT,
      },
      {
        id: 'systems',
        href: 'systems',
        name: t('Storage Systems'),
        component: StorageSystemListPage,
        contextId: ODF_DASHBOARD_CONTEXT,
      },
    ],
    [t]
  );

  const { isODFNsLoaded, odfNsLoadError } = useODFNamespaceSelector();

  const [extensions, isLoaded, error] = useResolvedExtensions<HorizontalNavTab>(
    isDashboardTab as ExtensionTypeGuard<HorizontalNavTab>
  );

  const haveExtensionsResolved = isLoaded && _.isEmpty(error);
  const sortedPages = useSortPages({
    extensions,
    haveExtensionsResolved,
    staticPages,
  });

  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (location.pathname.endsWith('/odf/systems')) {
      navigate(`/odf/cluster/systems`);
    }
  }, [location, navigate]);

  const navItems = convertDashboardTabToNav(sortedPages);

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeading title={title} />
      {/** Todo(bipuladh): Move to usage of common PF Tabs component */}
      <StatusBox
        loaded={isLoaded && isODFNsLoaded}
        loadError={!_.isEmpty(error) || odfNsLoadError}
        data={navItems}
      >
        <HorizontalNav pages={navItems} />
      </StatusBox>
    </>
  );
};

/**
 * To support legacy /odf routes.
 * Todo(fix): Remove from console in 4.10.
 */
export const Reroute: React.FC<{}> = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate(`/odf/cluster`);
  }, [navigate]);

  return null;
};

export default ODFDashboardPage;
