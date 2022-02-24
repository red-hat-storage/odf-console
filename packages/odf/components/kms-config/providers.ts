import * as React from 'react';
import { ModalComponentProps } from '@odf/shared/generic/ModalTitle';
import { HandlePromiseProps } from '@odf/shared/generic/promise-component';
import { CreateStorageSystemAction, WizardState } from '../create-storage-system/reducer';

export type EncryptionDispatch = React.Dispatch<CreateStorageSystemAction>;

export type KMSConfigureProps = {
  state: Pick<WizardState['securityAndNetwork'], 'encryption' | 'kms'>;
  dispatch: EncryptionDispatch;
  className: string;
  infraType?: string;
  mode?: string;
  isWizardFlow?: boolean;
};

export type AdvancedKMSModalProps = {
  state: Pick<WizardState['securityAndNetwork'], 'encryption' | 'kms'>;
  dispatch: EncryptionDispatch;
  mode?: string;
} & HandlePromiseProps &
  ModalComponentProps;
