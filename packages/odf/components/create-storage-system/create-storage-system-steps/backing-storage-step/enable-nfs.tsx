import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Alert, FormGroup, Checkbox } from '@patternfly/react-core';
import { BackingStorageType } from '../../../../types';
import { WizardDispatch, WizardState } from '../../reducer';
import './backing-storage-step.scss';

export const EnableNFS: React.FC<EnableNFSProps> = ({
  dispatch,
  nfsEnabled,
  backingStorageType,
}) => {
  const { t } = useCustomTranslation();

  return (
    <FormGroup>
      <Checkbox
        id="enable-nfs"
        label={t('Enable network file system (NFS)')}
        description={t('Allow NFS to use low resources by default.')}
        isChecked={nfsEnabled}
        onChange={() =>
          dispatch({ type: 'backingStorage/enableNFS', payload: !nfsEnabled })
        }
        className="odf-backing-store__radio--margin-bottom"
      />
      {backingStorageType === BackingStorageType.EXTERNAL && nfsEnabled && (
        <Alert
          variant="warning"
          isInline
          isPlain
          title={t(
            'NFS is currently not supported for external storage type. To proceed with an external storage type, disable this option.'
          )}
        />
      )}
    </FormGroup>
  );
};

type EnableNFSProps = {
  dispatch: WizardDispatch;
  nfsEnabled: WizardState['backingStorage']['enableNFS'];
  backingStorageType: WizardState['backingStorage']['type'];
};
