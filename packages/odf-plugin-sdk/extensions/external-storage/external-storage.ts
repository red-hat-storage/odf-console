import { K8sResourceKind } from '@odf/shared/types';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import {
  Extension,
  ExtensionDeclaration,
} from '@openshift-console/dynamic-plugin-sdk/lib/types';
import { Control } from 'react-hook-form';
import { ObjectSchema } from 'yup';

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Model = PartialBy<K8sModel, 'abbr' | 'label' | 'labelPlural'>;

/**
 *  Configures a new external storage vendor to the Storage System Creation wizard.
 */
export type StorageClassWizardStepExtensionProps = {
  /** Display name of the external storage vendor. */
  displayName: string;
  /** The model referring the `apiGroup`,`apiVersion`, `plural` and `kind` of the external storage vendor's CRD. */
  model: Model;
  /** A React Functional Component to input the connection details of the external storage vendor. */
  component: React.FunctionComponent<StorageClassComponentProps<{}>>;
  /** A React Hook returning the `Yup` schema object (if `react-hook-form` is used in the `component`) */
  schemaHandler?: () => ObjectSchema<{}>;
  /**  Handler function to create external storage storage vendor CR or resources. */
  createPayload: CreatePayload<{}>;
  /**  Handler function to validate the storage class page in order to move to the next step of wizard */
  canGoToNextStep: CanGoToNextStep<{}>;
  /** A function returing a promise, resolving any resources which should be created (if any) before creation of external sub-system */
  waitToCreate?: WaitToCreate;
};

export type StorageClassComponentProps<S = ExternalState> = {
  /** The state of the `StorageClassWizardStepExtensionProps.component` */
  formState: S;
  /** The callback for setting the state of `StorageClassWizardStepExtensionProps.component` */
  setFormState: (field: keyof S, value: S[keyof S]) => void;
  /** The object for registering components into `react-hook-form` */
  control?: Control;
};

type DbBackupConfig = {
  schedule: string;
  volumeSnapshot: {
    maxSnapshots: number;
    volumeSnapshotClass: string;
  };
};

/**
 *  @function CreatePayload<S>
 *
 *    @param {string} systemName
 *    The name of the external storage system requried for the creation of the external custom resource.
 *
 *    @param {S extends ExternalState} state
 *    The other fields of the create storage class form.
 *
 *    @param {ExtensionK8sModel} model
 *    The model referring the `apiGroup`,`apiVersion` and `kind` of the external storage vendor's CRD.
 *
 *    @param {string} storageClassName
 *    The name of the of the storage class.
 *
 *    @returns {Payload} An array of payloads of `Payload` type.
 */
export type CreatePayload<S = ExternalState> = (payloadOptions: {
  systemName: string;
  state: S;
  namespace: string;
  storageClassName?: string;
  inTransitStatus?: boolean;
  shouldSetCephRBDAsDefault?: boolean;
  isDbBackup?: boolean;
  dbBackup?: DbBackupConfig;
}) => Payload[];

export type Payload = { model: Model; payload: K8sResourceKind };

/**
 *  @function CanGoToNextStep<S>
 *
 *    @param {S extends ExternalState} state
 *    The other fields of the create storage class form.
 *
 *    @param {string} storageClassName
 *    The name of the of the storage class.
 *
 *    @returns {boolean} A boolean value.
 */
export type CanGoToNextStep<S = ExternalState> = (
  state: S,
  storageClassName: string
) => boolean;

export type WaitToCreate = (
  model: Model,
  maxAttempts?: number
) => Promise<void>;

export type ExternalStateValues = string | number | Object | Array<any>;

export type ExternalState = { [key: string]: ExternalStateValues };

export type StorageClassWizardStep = ExtensionDeclaration<
  'odf.wizard/storageclass',
  StorageClassWizardStepExtensionProps
>;

export const isStorageClassWizardStep = (
  e: Extension
): e is StorageClassWizardStep => e.type === 'odf.wizard/storageclass';
