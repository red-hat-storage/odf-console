import * as React from 'react';
import PageHeading from '@odf/shared/heading/page-heading';
import { HorizontalNav, useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router';
import { useLocation, match as Match } from 'react-router-dom';
import OCSSystemDashboard, {
  BLOCK_FILE,
  CEPH_FLAG,
  MCG_FLAG,
  OBJECT,
  Page,
} from './ocs-system-dashboard';

export type DashboardsPageProps = RouteComponentProps;

type ODFSystemDashboardPageProps = Omit<DashboardsPageProps, 'match'> & {
  match: Match<{ systemName: string }>;
};

const ODFSystemDashboard: React.FC<ODFSystemDashboardPageProps> = ({
  ...rest
}) => {
  const { t } = useTranslation();
  const isObjectServiceAvailable = useFlag(MCG_FLAG);
  const isCephAvailable = useFlag(CEPH_FLAG);
  const { systemName } = rest.match.params;
  const dashboardTab =
    !isCephAvailable && isObjectServiceAvailable ? OBJECT : BLOCK_FILE;
  const defaultDashboard = React.useRef(dashboardTab);
  const [pages] = React.useState<Page[]>([
    {
      path: 'overview/:dashboard',
      href: `overview/${defaultDashboard.current}`,
      name: t('ceph-storage-plugin~Overview'),
      component: OCSSystemDashboard,
    },
  ]);

  const breadcrumbs = [
    {
      name: t('ceph-storage-plugin~StorageSystems'),
      path: '/odf/systems',
    },
    {
      name: t('ceph-storage-plugin~StorageSystem details'),
      path: '',
    },
  ];

  const title = rest.match.params.systemName;

  const location = useLocation();

  React.useEffect(() => {
    if (location.pathname.endsWith(systemName)) {
      rest.history.push(
        `${location.pathname}/overview/${defaultDashboard.current}`
      );
    } else if (location.pathname.endsWith('overview')) {
      rest.history.push(`${location.pathname}/${defaultDashboard.current}`);
    } else if (defaultDashboard.current !== dashboardTab) {
      const pathname = location.pathname.substring(
        0,
        location.pathname.lastIndexOf('/overview')
      );
      rest.history.push(`${pathname}/overview/${dashboardTab}`);
      defaultDashboard.current = dashboardTab;
    }
  }, [rest.history, location.pathname, systemName, dashboardTab]);

  return (
    <>
      <PageHeading title={title} breadcrumbs={breadcrumbs} />
      <HorizontalNav pages={pages as any} />
    </>
  );
};

export default ODFSystemDashboard;
