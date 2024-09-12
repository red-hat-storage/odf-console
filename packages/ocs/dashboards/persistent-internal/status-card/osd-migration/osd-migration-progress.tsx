import * as React from 'react';
import { OSDMigrationStatus } from '@odf/core/constants';
import { odfDRDocApplyPolicy } from '@odf/shared/constants/doc';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { DOC_VERSION as odfDocVersion } from '@odf/shared/hooks';
import { RedExclamationCircleIcon } from '@odf/shared/status/icons';
import { CephClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ViewDocumentation } from '@odf/shared/utils';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Divider, Flex, FlexItem } from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
import {
  getOSDMigrationMetrics,
  getOSDMigrationStatus,
} from '../../../../utils/osd-migration';

export const OSDMigrationProgress: React.FC<OSDMigrationProgressProps> = ({
  cephData,
  dataLoaded,
  dataLoadError,
}) => {
  const { t } = useCustomTranslation();

  const { blueStoreRdrCount, totalOSDCount } = getOSDMigrationMetrics(cephData);
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
            <FlexItem className="pf-m-spacer-none">
              <HealthItem
                title={t('Cluster ready for Regional-DR setup.')}
                state={HealthState.OK}
              />
            </FlexItem>
            <FlexItem>
              <ViewDocumentation
                text={t('Setting up disaster recovery')}
                doclink={odfDRDocApplyPolicy(odfDocVersion)}
                hideDocLink={!odfDocVersion}
              />
            </FlexItem>
          </>
        )}

        {migrationStatus === OSDMigrationStatus.IN_PROGRESS && (
          <>
            <FlexItem className="pf-v5-u-mt-xl">
              <HealthItem
                icon={<InProgressIcon className="co-dashboard-icon" />}
                disableDetails
                title={t('Migrating cluster OSDs')}
              />
            </FlexItem>
            <FlexItem className="pf-v5-u-mt-xl pf-m-align-right">
              {t('{{blueStoreRdrCount}}/{{totalOSDCount}} OSDs migrated', {
                blueStoreRdrCount,
                totalOSDCount,
              })}
            </FlexItem>
          </>
        )}

        {migrationStatus === OSDMigrationStatus.FAILED && (
          <>
            <FlexItem className="pf-v5-u-mt-xl">
              <HealthItem
                icon={
                  <RedExclamationCircleIcon className="co-dashboard-icon" />
                }
                disableDetails
                title={t('Could not migrate cluster OSDs. Check logs')}
              />
            </FlexItem>
            <FlexItem className="pf-v5-u-mt-xl pf-m-align-right">
              {t('{{ blueStoreRdrCount }}/{{ totalOSD }} remaining', {
                blueStoreRdrCount,
                totalOSDCount,
              })}
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
