import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import { MANAGEMENT_ROUTE } from '../../../constants';

const LifecycleRules = () => <>LIFECYCLE RULES</>;

const ManagementNav = ({ obj }) => {
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

  return (
    <Tabs
      id="s3-management-tab"
      tabs={pages}
      customData={obj}
      basePath={MANAGEMENT_ROUTE}
    />
  );
};

export default ManagementNav;
