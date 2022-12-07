import {
  Extension,
  ExtensionDeclaration,
} from '@openshift-console/dynamic-plugin-sdk/lib/types';
import { StorageClassWizardStepProps } from '../properties/StorageClassWizardStepProps';

export type StorageClassWizardStep = ExtensionDeclaration<
  'odf.wizard/storageclass',
  StorageClassWizardStepProps
>;

export const isStorageClassWizardStep = (
  e: Extension
): e is StorageClassWizardStep => e.type === 'odf.wizard/storageclass';
