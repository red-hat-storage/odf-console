import * as React from 'react';
import { getOSDMigrationMetrics } from '@odf/ocs/utils';
import { CephClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Progress, ProgressSize } from '@patternfly/react-core';

export const ClusterMigrationActivity: React.FC<MigrationProps> = ({
  resource: cephData,
}) => {
  const { t } = useCustomTranslation();
  const { blueStoreCount, totalOSDCount, percentageComplete } =
    getOSDMigrationMetrics(cephData);

  return (
    <>
      {t('Migrating cluster OSDs')}
      <Progress
        value={percentageComplete}
        size={ProgressSize.sm}
        title={t('{{blueStoreCount}}/{{totalOSDCount}} OSDs migrated:', {
          blueStoreCount,
          totalOSDCount,
        })}
        label={`${percentageComplete}%`}
      />
    </>
  );
};

type MigrationProps = {
  resource: CephClusterKind;
};
