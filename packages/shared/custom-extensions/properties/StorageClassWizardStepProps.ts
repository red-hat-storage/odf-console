import { K8sResourceKind } from '@odf/shared/types';

/**
 *  Configures a new external storage vendor to the Storage System Creation wizard.
 */
export type StorageClassWizardStepProps = {
  /** Display name of the external storage vendor. */
  displayName: string;
  /** The model referring the `apiGroup`,`apiVersion`, `plural` and `kind` of the external storage vendor's CRD. */
  model: Model;
  /** A React Functional Component to input the connection details of the external storage vendor. */
  component: React.FunctionComponent<StorageClassComponentProps<{}>>;
  /**  Handler function to create external storage storage vendor CR or resources. */
  createPayload: CreatePayload<{}>;
  /**  Handler function to validate the storage class page in order to move to the next step of wizard */
  canGoToNextStep: CanGoToNextStep<{}>;
  /** A function returing a promise, resolving any resources which should be created (if any) before creation of external sub-system */
  waitToCreate?: (model: Model) => Promise<any>;
};

/** The model referring the `apiGroup`,`apiVersion`, `plural` and `kind` of the external storage vendor's CRD. */

type Model = {
  /* apiGroup of the external provider CRD */
  apiGroup: string;
  /* apiVersion of the external provider CRD */
  apiVersion: string;
  /* kind of the external provider CRD */
  kind: string;
  /* plural of the external provider CRD */
  plural: string;
};

/** Props for `StorageClassWizardStepProps.component` to input the connection details of the external storage vendor. */
export type StorageClassComponentProps<S extends ExternalState> = {
  /** The state of the `StorageClassWizardStepProps.component`. */
  formState: S;
  /** The callback for setting the state of `StorageClassWizardStepProps.component` */
  setFormState: (field: keyof S, value: S[keyof S]) => void;
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
export type CreatePayload<S extends ExternalState> = (
  systemName: string,
  state: S,
  model: Model,
  storageClassName: string
) => Payload[];

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
export type CanGoToNextStep<S extends ExternalState> = (
  state: S,
  storageClassName: string
) => boolean;

export type ExternalState = {};
