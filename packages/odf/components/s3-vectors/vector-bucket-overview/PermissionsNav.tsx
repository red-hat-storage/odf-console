import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import { PERMISSIONS_ROUTE } from '../../../constants';
import VectorBucketPolicy from '../vector-bucket-policy/VectorBucketPolicy';

const PermissionsNav = ({ obj }) => {
  const { t } = useCustomTranslation();

  const pages: TabPage[] = React.useMemo(
    () => [
      {
        href: 'policy',
        title: t('Bucket policy'),
        component: VectorBucketPolicy,
      },
    ],
    [t]
  );

  return (
    <Tabs
      id="s3-vectors-permissions-tab"
      tabs={pages}
      customData={obj}
      basePath={PERMISSIONS_ROUTE}
    />
  );
};

export default PermissionsNav;
