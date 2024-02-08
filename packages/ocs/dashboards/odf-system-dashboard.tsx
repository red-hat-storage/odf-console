import * as React from 'react';
import { LoadingBox } from '@odf/shared/generic/status-box';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { RouteComponentProps } from 'react-router';
import { match as Match } from 'react-router-dom';
import {
  CEPH_FLAG,
  OCS_INDEPENDENT_FLAG,
  PROVIDER_MODE,
} from '../../odf/features';
import { BlockPoolListPage } from '../block-pool/BlockPoolListPage';
import { CephBlockPoolModel } from '../models';
import OCSSystemDashboard from './ocs-system-dashboard';

export type DashboardsPageProps = RouteComponentProps;

type ODFSystemDashboardPageProps = Omit<DashboardsPageProps, 'match'> & {
  match: Match<{ systemName: string }>;
};

const blockPoolHref = referenceForModel(CephBlockPoolModel);

const ODFSystemDashboard: React.FC<ODFSystemDashboardPageProps> = ({
  match,
}) => {
  const { t } = useCustomTranslation();
  const breadcrumbs = [
    {
      name: t('StorageSystems'),
      path: '/odf/systems',
    },
    {
      name: t('StorageSystem details'),
      path: '',
    },
  ];

  const [pages, setPages] = React.useState<TabPage[]>([
    {
      title: t('Overview'),
      href: 'overview',
      component: OCSSystemDashboard,
    },
  ]);
  const isCephAvailable = useFlag(CEPH_FLAG);
  const isExternal = useFlag(OCS_INDEPENDENT_FLAG);
  const isProviderMode = useFlag(PROVIDER_MODE);

  React.useEffect(() => {
    const isBlockPoolAdded = pages.find((page) => page.href === blockPoolHref);
    if (
      isCephAvailable &&
      !isBlockPoolAdded &&
      !isExternal &&
      !isProviderMode
    ) {
      setPages((p) => [
        ...p,
        {
          title: t('BlockPools'),
          href: blockPoolHref,
          component: BlockPoolListPage,
        },
      ]);
    }
    if (isBlockPoolAdded && isExternal) {
      setPages((p) => p.filter((page) => page.href !== blockPoolHref));
    }
  }, [isExternal, isCephAvailable, isProviderMode, pages, setPages, t]);

  const title = match.params.systemName;

  return (
    <>
      <PageHeading title={title} breadcrumbs={breadcrumbs} />
      {pages.length > 0 ? (
        <Tabs id="odf-tab" match={match} tabs={pages} />
      ) : (
        <LoadingBox />
      )}
    </>
  );
};

export default ODFSystemDashboard;
