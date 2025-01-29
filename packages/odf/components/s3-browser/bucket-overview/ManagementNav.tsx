import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';

const LifecycleRules = () => <>LIFECYCLE RULES</>;

const ManagementNav = () => {
  const { t } = useCustomTranslation();

  const pages: TabPage[] = React.useMemo(
    () => [
      {
        href: 'lifecycle',
        title: t('Lifecycle rules'),
        component: LifecycleRules,
      },
    ],
    [t]
  );

  return <Tabs id="s3-management-tab" tabs={pages} basePath="management" />;
};

export default ManagementNav;
