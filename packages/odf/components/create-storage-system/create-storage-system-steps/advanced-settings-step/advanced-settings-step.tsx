import * as React from 'react';
import { DeploymentType } from '@odf/core/types';
import {
  ListKind,
  StorageClassResourceKind,
  TechPreviewBadge,
  useK8sGet,
} from '@odf/shared';
import { StorageClassModel } from '@odf/shared/models';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isDefaultClass } from '@odf/shared/utils';
import { Form, FormGroup, Checkbox } from '@patternfly/react-core';
import { WizardState, WizardDispatch } from '../../reducer';
import { EnableNFS } from '../backing-storage-step/enable-nfs';
import { PostgresConnectionDetails } from '../backing-storage-step/noobaa-external-postgres/postgres-connection-details';
import { SetCephRBDStorageClassDefault } from '../backing-storage-step/set-rbd-sc-default';
import { AutomaticBackup } from './automatic-backup/automatic-backup';

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  state,
  dispatch,
  hasOCS,
  hasMultipleClusters,
}) => {
  const { t } = useCustomTranslation();
  const {
    enableNFS,
    isRBDStorageClassDefault,
    externalPostgres,
    useExternalPostgres,
    deployment,
    isDbBackup,
    type: backingStorageType,
  } = state;

  const [sc, scLoaded] =
    useK8sGet<ListKind<StorageClassResourceKind>>(StorageClassModel);

  const isFullDeployment = deployment === DeploymentType.FULL;
  // Return true while loading to prevent auto-check, then actual value once loaded
  const doesDefaultSCAlreadyExists = scLoaded
    ? sc?.items?.some((item) => isDefaultClass(item)) || false
    : true;

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
              doesDefaultSCAlreadyExists={doesDefaultSCAlreadyExists}
            />
          </>
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
                type: 'backingStorage/useExternalPostgres',
                payload: !useExternalPostgres,
              })
            }
            className="odf-backing-store__radio--margin-bottom"
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
            deployment={deployment}
          />
        )}
      </FormGroup>
    </Form>
  );
};

type AdvancedSettingsProps = {
  dispatch: WizardDispatch;
  state: WizardState['backingStorage'];
  hasOCS: boolean;
  hasMultipleClusters: boolean;
};
