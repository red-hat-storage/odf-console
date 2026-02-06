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

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  state,
  dispatch,
  hasOCS,
  hasMultipleClusters,
  deployment,
  backingStorageType,
}) => {
  const { t } = useCustomTranslation();
  const {
    enableNFS,
    isRBDStorageClassDefault,
    externalPostgres,
    useExternalPostgres,
    isDbBackup,
    dbBackup,
  } = state;

  const isFullDeployment = deployment === DeploymentType.FULL;

  const isMCG = deployment === DeploymentType.MCG;
  return (
    <Form>
      <FormGroup label={t('Advanced Settings')} fieldId="advanced-settings">
        {/* Should be visible for both external and internal mode (but only single NooBaa is allowed, so should be hidden if any cluster already exists) */}
        {isFullDeployment && !hasMultipleClusters && (
          <>
            <EnableNFS
              dispatch={dispatch}
              nfsEnabled={enableNFS}
              backingStorageType={backingStorageType}
            />
            <SetCephRBDStorageClassDefault
              dispatch={dispatch}
              isRBDStorageClassDefault={isRBDStorageClassDefault}
            />
          </>
        )}
        {isFullDeployment && !hasMultipleClusters && (
          <SetVirtualizeSCDefault
            dispatch={dispatch}
            isVirtualizeStorageClassDefault={
              state.isVirtualizeStorageClassDefault
            }
          />
        )}
        {/* Should be visible for both external and internal mode (but only single NooBaa is allowed, so should be hidden if any cluster already exists) */}
        {!hasOCS && (
          <Checkbox
            id="use-external-postgress"
            label={
              <>
                {t('Use external PostgreSQL')}
                <span className="pf-v5-u-ml-sm">
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
                type: 'advancedSettings/useExternalPostgres',
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
          />
        )}
      </FormGroup>
    </Form>
  );
};

type AdvancedSettingsProps = {
  dispatch: WizardDispatch;
  state: WizardState['advancedSettings'];
  hasOCS: boolean;
  hasMultipleClusters: boolean;
  deployment: DeploymentType;
  backingStorageType: BackingStorageType;
};
