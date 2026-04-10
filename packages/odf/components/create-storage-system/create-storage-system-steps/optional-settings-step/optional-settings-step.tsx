import * as React from 'react';
import { BackingStorageType, DeploymentType } from '@odf/core/types';
import { TechPreviewBadge } from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Form, FormGroup, Checkbox } from '@patternfly/react-core';
import { WizardState, WizardDispatch } from '../../reducer';
import { EnableNFS } from '../backing-storage-step/enable-nfs';
import { PostgresConnectionDetails } from '../backing-storage-step/noobaa-external-postgres/postgres-connection-details';
import { SetCephRBDStorageClassDefault } from '../backing-storage-step/set-rbd-sc-default';
import SetVirtualizeSCDefault from '../backing-storage-step/set-virtualize-sc-default';
import { AutomaticBackup } from './automatic-backup/automatic-backup';

export const OptionalSettings: React.FC<OptionalSettingsProps> = ({
  state,
  dispatch,
  hasOCS,
  hasMultipleClusters,
  deployment,
  backingStorageType,
  isTNFEnabled,
}) => {
  const { t } = useCustomTranslation();
  const {
    enableNFS,
    isRBDStorageClassDefault,
    isVirtualizeStorageClassDefault,
    externalPostgres,
    useExternalPostgres,
    isDbBackup,
    dbBackup,
  } = state;

  const isFullDeployment = deployment === DeploymentType.FULL;
  const isMCG = deployment === DeploymentType.MCG;

  return (
    <Form>
      <FormGroup label={t('Optional Settings')} fieldId="optional-settings">
        {isFullDeployment && !hasMultipleClusters && (
          <>
            <EnableNFS
              dispatch={dispatch}
              nfsEnabled={enableNFS}
              backingStorageType={backingStorageType}
              isTNFEnabled={isTNFEnabled}
            />
            <SetCephRBDStorageClassDefault
              dispatch={dispatch}
              isRBDStorageClassDefault={isRBDStorageClassDefault}
            />
            <SetVirtualizeSCDefault
              dispatch={dispatch}
              isVirtualizeStorageClassDefault={isVirtualizeStorageClassDefault}
            />
          </>
        )}
        {!hasOCS && (
          <Checkbox
            id="use-external-postgress"
            label={
              <>
                {t('Use external PostgreSQL')}
                <span className="pf-v6-u-ml-sm">
                  <TechPreviewBadge />
                </span>
              </>
            }
            description={t(
              'Allow Noobaa to connect to an external postgres server'
            )}
            isChecked={useExternalPostgres}
            onChange={() =>
              dispatch({
                type: 'optionalSettings/useExternalPostgres',
                payload: !useExternalPostgres,
              })
            }
            className="odf-backing-store__radio--margin-bottom"
            isDisabled={isDbBackup}
          />
        )}
        {useExternalPostgres && !hasOCS && (
          <PostgresConnectionDetails
            dispatch={dispatch}
            tlsFiles={[
              externalPostgres.tls.keys.private,
              externalPostgres.tls.keys.public,
            ]}
            tlsEnabled={externalPostgres.tls.enabled}
            allowSelfSignedCerts={externalPostgres.tls.allowSelfSignedCerts}
            username={externalPostgres.username}
            password={externalPostgres.password}
            serverName={externalPostgres.serverName}
            databaseName={externalPostgres.databaseName}
            port={externalPostgres.port}
            enableClientSideCerts={externalPostgres.tls.enableClientSideCerts}
          />
        )}
        {!hasOCS && (
          <AutomaticBackup
            isDbBackup={isDbBackup}
            dispatch={dispatch}
            isMCG={isMCG}
            dbBackup={dbBackup}
            isExternalPostgresEnabled={useExternalPostgres}
            isTNFEnabled={isTNFEnabled}
          />
        )}
      </FormGroup>
    </Form>
  );
};

type OptionalSettingsProps = {
  dispatch: WizardDispatch;
  state: WizardState['optionalSettings'];
  hasOCS: boolean;
  hasMultipleClusters: boolean;
  deployment: DeploymentType;
  backingStorageType: BackingStorageType;
  isTNFEnabled: boolean;
};
