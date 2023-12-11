import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { useParams } from 'react-router-dom-v5-compat';
import { CEPH_FLAG, OCS_INDEPENDENT_FLAG } from '../../odf/features';
import { BlockPoolListPage } from '../block-pool/BlockPoolListPage';
import { CephBlockPoolModel } from '../models';
import OCSSystemDashboard from './ocs-system-dashboard';

const blockPoolHref = referenceForModel(CephBlockPoolModel);

const ODFSystemDashboard: React.FC<{}> = ({}) => {
  const { systemName: title } = useParams();
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

  React.useEffect(() => {
    const isBlockPoolAdded = pages.find((page) => page.href === blockPoolHref);
    if (isCephAvailable && !isBlockPoolAdded && !isExternal) {
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
  }, [isExternal, isCephAvailable, pages, setPages, t]);

  const arePagesLoaded = pages.length > 0;

  return (
    <>
      <PageHeading title={title} breadcrumbs={breadcrumbs} />
      <NamespaceSafetyBox areResourcesLoaded={arePagesLoaded}>
        <Tabs id="odf-tab" tabs={pages} />
      </NamespaceSafetyBox>
    </>
  );
};

export default ODFSystemDashboard;
