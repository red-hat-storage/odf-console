import * as React from 'react';
import {
  CreateStorageSystemAction,
  WizardState,
} from '../create-storage-system/reducer';

export type EncryptionDispatch = React.Dispatch<CreateStorageSystemAction>;

export type KMSConfigureProps = {
  state: Pick<WizardState['securityAndNetwork'], 'encryption' | 'kms'>;
  dispatch: EncryptionDispatch;
  className: string;
  infraType?: string;
  mode?: string;
  isWizardFlow?: boolean;
  isMCG?: boolean;
};

export type AdvancedKMSModalProps = {
  state: Pick<WizardState['securityAndNetwork'], 'encryption' | 'kms'>;
  dispatch: EncryptionDispatch;
  mode?: string;
  isWizardFlow?: boolean;
};
