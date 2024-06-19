import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import { useParams } from 'react-router-dom-v5-compat';
import { StoragePoolListPage } from '../storage-pool/StoragePoolListPage';
import { ODFSystemParams } from '../types';
import OCSSystemDashboard from './ocs-system-dashboard';

const storagePoolHref = 'storage-pools';

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
    const isStoragePoolAdded = pages.find(
      (page) => page.href === storagePoolHref
    );
    if (isCephAvailable && !isStoragePoolAdded && !isExternal) {
      setPages((p) => [
        ...p,
        {
          title: t('Storage pools'),
          href: storagePoolHref,
          component: StoragePoolListPage,
        },
      ]);
    }
    if (isStoragePoolAdded && isExternal) {
      setPages((p) => p.filter((page) => page.href !== storagePoolHref));
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
