import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'react-i18next';
import {
  Alert,
  FormGroup,
  Checkbox,
  AlertVariant,
} from '@patternfly/react-core';
import { BackingStorageType } from '../../../../types';
import { WizardDispatch, WizardState } from '../../reducer';
import './backing-storage-step.scss';

const getValidationAlert = (
  backingStorageType: BackingStorageType,
  nfsEnabled: boolean,
  t: TFunction
): ValidationAlert => {
  if (backingStorageType === BackingStorageType.EXTERNAL && nfsEnabled)
    return [
      true,
      AlertVariant.warning,
      t(
        'NFS is currently not supported for external storage type. To proceed with an external storage type, disable this option.'
      ),
    ];
  else if (backingStorageType === BackingStorageType.EXTERNAL && !nfsEnabled)
    return [
      true,
      AlertVariant.info,
      t('NFS is currently not supported for external storage type.'),
    ];
  else return [false, null, null];
};

export const EnableNFS: React.FC<EnableNFSProps> = ({
  dispatch,
  nfsEnabled,
  backingStorageType,
}) => {
  const { t } = useCustomTranslation();
  const [showAlert, variant, title] = getValidationAlert(
    backingStorageType,
    nfsEnabled,
    t
  );

  return (
    <FormGroup>
      <Checkbox
        id="enable-nfs"
        label={t('Enable network file system (NFS)')}
        description={t('Allow NFS to use low resources by default.')}
        isChecked={nfsEnabled}
        onChange={() =>
          dispatch({ type: 'advancedSettings/enableNFS', payload: !nfsEnabled })
        }
        isDisabled={
          backingStorageType === BackingStorageType.EXTERNAL && !nfsEnabled
        }
        className="odf-backing-store__radio--margin-bottom"
      />
      {showAlert && <Alert variant={variant} isInline isPlain title={title} />}
    </FormGroup>
  );
};

type ValidationAlert = [
  showAlert: boolean,
  variant: AlertVariant,
  title: string,
];

type EnableNFSProps = {
  dispatch: WizardDispatch;
  nfsEnabled: WizardState['advancedSettings']['enableNFS'];
  backingStorageType: WizardState['backingStorage']['type'];
};
