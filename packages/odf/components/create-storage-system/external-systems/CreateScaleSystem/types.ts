import { WizardNodeState } from '../../reducer';

export type ScaleSystemComponentState = {
  selectedNodes: WizardNodeState[];
  caCertificate: string;
  encryptionCert: string;
  encryptionEnabled: boolean;
};

export const initialComponentState: ScaleSystemComponentState = {
  selectedNodes: [],
  caCertificate: '',
  encryptionCert: '',
  encryptionEnabled: false,
};
