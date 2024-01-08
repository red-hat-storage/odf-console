import * as React from 'react';
import {
  OSDMigrationStatus,
  BLUESTORE,
  BLUESTORE_RDR,
} from '@odf/core/constants';
import { ODF_DR_DOC_HOME } from '@odf/shared/constants/doc';
import { RedExclamationCircleIcon } from '@odf/shared/status/icons';
import { CephClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ViewDocumentation } from '@odf/shared/utils';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { HealthItem } from '@openshift-console/dynamic-plugin-sdk-internal';
import * as _ from 'lodash-es';
import { Divider, Flex, FlexItem } from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
import {
  getCephStoreType,
  getOSDMigrationStatus,
} from '../../../../utils/osd-migration';

const calculateOSDMigration = (
  cephData: CephClusterKind,
  loaded: boolean,
  loadError: any
): [number, number, number] => {
  if (!loaded || !_.isEmpty(loadError)) {
    return [null, null, null];
  }
  const migratedDevices = getCephStoreType(cephData)?.[BLUESTORE_RDR] || 0;
  const totalOsd =
    (getCephStoreType(cephData)?.[BLUESTORE] || 0) + migratedDevices;
  const percentageComplete =
    totalOsd !== 0 ? Math.round((migratedDevices / totalOsd) * 100) : 0;

  return [migratedDevices, totalOsd, percentageComplete];
};

export const OSDMigrationProgress: React.FC<OSDMigrationProgressProps> = ({
  cephData,
  dataLoaded,
  dataLoadError,
}) => {
  const { t } = useCustomTranslation();
  const [migratedDevices, totalOsd, percentageComplete] = calculateOSDMigration(
    cephData,
    dataLoaded,
    dataLoadError
  );
  const migrationStatus: string =
    dataLoaded && _.isEmpty(dataLoadError)
      ? getOSDMigrationStatus(cephData)
      : null;

  if (!migrationStatus) return <></>;

  return (
    <>
      {migrationStatus !== OSDMigrationStatus.PENDING && <Divider />}
      <Flex alignItems={{ default: 'alignItemsCenter' }}>
        {migrationStatus === OSDMigrationStatus.COMPLETED && (
          <>
            <FlexItem>
              <HealthItem
                title={t('Cluster ready for Regional-DR setup.')}
                state={HealthState.OK}
              />
            </FlexItem>
            <FlexItem>
              <ViewDocumentation
                text={t('Setting up disaster recovery')}
                doclink={ODF_DR_DOC_HOME}
              />
            </FlexItem>
          </>
        )}

        {migrationStatus === OSDMigrationStatus.IN_PROGRESS && (
          <>
            <FlexItem className="pf-u-mt-xl">
              <HealthItem
                icon={<InProgressIcon className="co-dashboard-icon" />}
                state={HealthState.OK}
                title={t('Cluster OSDs are being migrated')}
              />
            </FlexItem>
            <FlexItem className="pf-u-mt-xl">
              {t(
                '{{ percentageComplete }}% completed ({{ migratedDevices }}/{{ totalOsd }} remaining)',
                {
                  percentageComplete,
                  migratedDevices,
                  totalOsd,
                }
              )}
            </FlexItem>
          </>
        )}

        {migrationStatus === OSDMigrationStatus.FAILED && (
          <>
            <FlexItem>
              <HealthItem
                state={HealthState.OK}
                icon={
                  <RedExclamationCircleIcon className="co-dashboard-icon" />
                }
                title={t('Could not migrate cluster OSDs.')}
              />
            </FlexItem>
            <FlexItem>
              <ViewDocumentation
                text={t('Check documentation')}
                doclink={ODF_DR_DOC_HOME}
              />
            </FlexItem>
            <FlexItem align={{ default: 'alignRight' }}>
              {t(
                '{{ percentageComplete }}% completed ({{ migratedDevices }}/{{ totalOsd }} remaining)',
                {
                  percentageComplete,
                  migratedDevices,
                  totalOsd,
                }
              )}
            </FlexItem>
          </>
        )}
      </Flex>
    </>
  );
};

type OSDMigrationProgressProps = {
  cephData: CephClusterKind;
  dataLoaded: boolean;
  dataLoadError: any;
};
