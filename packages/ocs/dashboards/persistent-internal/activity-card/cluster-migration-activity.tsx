import * as React from 'react';
import { getOSDMigrationMetrics } from '@odf/ocs/utils';
import { CephClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Progress, ProgressSize } from '@patternfly/react-core';

export const ClusterMigrationActivity: React.FC<MigrationProps> = ({
  resource: cephData,
}) => {
  const { t } = useCustomTranslation();
  const { blueStoreRdrCount, totalOSDCount, percentageComplete } =
    getOSDMigrationMetrics(cephData);

  return (
    <>
      {t('Migrating cluster OSDs')}
      <Progress
        value={percentageComplete}
        size={ProgressSize.sm}
        title={t('{{blueStoreRdrCount}}/{{totalOSDCount}} OSDs migrated:', {
          blueStoreRdrCount,
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
