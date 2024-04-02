import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import { useParams } from 'react-router-dom-v5-compat';
import { BlockPoolListPage } from '../block-pool/BlockPoolListPage';
import { CephBlockPoolModel } from '../models';
import { ODFSystemParams } from '../types';
import OCSSystemDashboard from './ocs-system-dashboard';

const blockPoolHref = referenceForModel(CephBlockPoolModel);

const ODFSystemDashboard: React.FC<{}> = ({}) => {
  const { t } = useCustomTranslation();

  const { systemName: title, namespace: clusterNs } =
    useParams<ODFSystemParams>();
  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();

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
  const isCephAvailable = systemFlags[clusterNs]?.isCephAvailable;
  const isExternal = systemFlags[clusterNs]?.isExternalMode;

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

  const loaded = pages.length > 0 && areFlagsLoaded;

  return (
    <>
      <PageHeading title={title} breadcrumbs={breadcrumbs} />
      <NamespaceSafetyBox
        areResourcesLoaded={loaded}
        resourcesError={flagsLoadError}
      >
        <Tabs id="odf-tab" tabs={pages} />
      </NamespaceSafetyBox>
    </>
  );
};

export default ODFSystemDashboard;
