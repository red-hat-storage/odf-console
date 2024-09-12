import * as React from 'react';
import { OSDMigrationStatus } from '@odf/core/constants';
import { getOSDMigrationStatus } from '@odf/ocs/utils';
import { CephClusterKind, StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  StatusIconAndText,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { Button } from '@patternfly/react-core';
import OSDMigrationModal from '../../dashboards/persistent-internal/status-card/osd-migration/osd-migration-modal';

type OSDMigrationDetailsProps = {
  cephData: CephClusterKind;
  ocsData: StorageClusterKind;
  loaded: boolean;
  loadError: any;
};

export const OSDMigrationDetails: React.FC<OSDMigrationDetailsProps> = ({
  cephData,
  ocsData,
  loaded,
  loadError,
}) => {
  const { t } = useCustomTranslation();
  const osdMigrationStatus: string =
    !loadError && loaded ? getOSDMigrationStatus(cephData) : null;
  const launcher = useModal();

  if (!loaded || loadError) return <></>;

  return (
    <div className="pf-v5-l-flex">
      <div className="pf-v5-l-flex__item pf-m-spacer-xs">
        <StatusIconAndText
          title={osdMigrationStatus}
          icon={
            (osdMigrationStatus === OSDMigrationStatus.FAILED && (
              <RedExclamationCircleIcon />
            )) ||
            (osdMigrationStatus === OSDMigrationStatus.COMPLETED && (
              <GreenCheckCircleIcon />
            ))
          }
        />
      </div>
      <div className="pf-v5-l-flex__item">
        {osdMigrationStatus === OSDMigrationStatus.PENDING && (
          <Button
            variant="link"
            onClick={() =>
              launcher(OSDMigrationModal, {
                isOpen: true,
                extraProps: { ocsData },
              })
            }
          >
            {t('(Prepare cluster for DR setup)')}
          </Button>
        )}
      </div>
    </div>
  );
};
