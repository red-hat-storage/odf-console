import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';

const BucketPolicy = () => <>BUCKET POLICY</>;
const Cors = () => <>CORS</>;

const PermissionsNav = () => {
  const { t } = useCustomTranslation();

  const pages: TabPage[] = React.useMemo(
    () => [
      {
        href: 'policy',
        title: t('Bucket policy'),
        component: BucketPolicy,
      },
      {
        href: 'cors',
        title: t('CORS'),
        component: Cors,
      },
    ],
    [t]
  );

  return <Tabs id="s3-permissions-tab" tabs={pages} basePath="permissions" />;
};

export default PermissionsNav;
