import { WizardNodeState } from '../../reducer';

export type SANSystemComponentState = {
  selectedNodes: WizardNodeState[];
  selectedLUNs: Set<string>;
  lunGroupName: string;
};

export const initialComponentState: SANSystemComponentState = {
  selectedNodes: [],
  selectedLUNs: new Set(),
  lunGroupName: '',
};
