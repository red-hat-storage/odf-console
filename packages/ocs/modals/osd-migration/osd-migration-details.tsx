import * as React from 'react';
import { OSDMigrationStatus } from '@odf/core/constants';
import { getOSDMigrationStatus } from '@odf/ocs/utils';
import { CephClusterKind, StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  RedExclamationCircleIcon,
  StatusIconAndText,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { Button, Flex, FlexItem } from '@patternfly/react-core';
import OSDMigrationModal from './osd-migration-modal';

export const OSDMigrationDetails: React.FC<OSDMigrationDetailsProps> = ({
  cephData,
  ocsData,
}) => {
  const { t } = useCustomTranslation();
  const osdMigrationStatus: string = getOSDMigrationStatus(cephData);
  const launcher = useModal();

  return (
    <>
      <Flex>
        <FlexItem>
          <StatusIconAndText
            title={osdMigrationStatus}
            icon={
              osdMigrationStatus === OSDMigrationStatus.FAILED && (
                <RedExclamationCircleIcon />
              )
            }
          />
        </FlexItem>
        <FlexItem>
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
              {t('Optimise cluster')}
            </Button>
          )}
        </FlexItem>
      </Flex>
    </>
  );
};

type OSDMigrationDetailsProps = {
  cephData: CephClusterKind;
  ocsData: StorageClusterKind;
};
