import { K8sResourceKind } from '@odf/shared/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { Control } from 'react-hook-form';

/**
 *  Configures a new external storage vendor to the Storage System Creation wizard.
 */
export type ExternalStorage = {
  /** Display name of the external storage vendor. */
  displayName: string;

  /** The model referring the `apiGroup`,`apiVersion`, `plural` and `kind` of the external storage vendor's CRD. */
  model: Model;

  /** A React Functional Component to input the connection details of the external storage vendor. */
  Component: React.FunctionComponent<ExternalComponentProps<{}>>;

  /**  Handler function to create external storage storage vendor CR or resources. */
  createPayload: CreatePayload<{}>;

  /**  Handler function to validate the storage class page in order to move to the next step of wizard */
  canGoToNextStep: CanGoToNextStep<{}>;
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

/** Props for `ExternalStorage.Component` to input the connection details of the external storage vendor. */
export type ExternalComponentProps<S extends ExternalState> = {
  /** The state of the `ExternalStorage.Component`. */
  formState: S;

  /** The callback for setting the state of `ExternalStorage.Component` */
  setFormState: (field: keyof S, value: S[keyof S]) => void;

  /**  react-hook-form control used to watch and validate input value*/
  control?: Control;
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
 *    optional @param {storageClassName} string
 *    applicable for IBM Flash Storage type
 *
 *    optional @param {inTransitStatus} string
 *    applicable for RHCS storage type where the network encryption is enabled or not.
 *
 *    @returns {Payload} An array of payloads of `Payload` type.
 */
export type CreatePayload<S extends ExternalState> = (payloadOptions: {
  systemName: string;
  state: S;
  model: Model;
  storageClassName?: string;
  inTransitStatus?: boolean;
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
export type CanGoToNextStep<S extends ExternalState> = (
  state: S,
  storageClassName: string
) => boolean;

/**
 * State for external components
 */
export type ExternalState = RHCSState | FlashSystemState | {};

export type ExternalStateValues = ValuesOfUnion<ExternalState>;

export type ExternalStateKeys = KeysOfUnion<ExternalState>;

type ValuesOfUnion<T> = T extends T ? T[keyof T] : never;

type KeysOfUnion<T> = T extends T ? keyof T : never;

/* External Stoarge State */

export type RHCSState = {
  fileData: string;
  errorMessage: boolean;
  isLoading: boolean;
  fileName: string;
};

export type IBMFlashSystemStatus = {
  capacity?: {
    maxCapacity: string;
    usedCapacity: string;
  };
  id?: string;
  state?: string;
  phase?: string;
  version?: string;
};

export type IBMFlashSystemSpec = {
  name?: string;
  defaultPool?: {
    fsType: string;
    poolName: string;
    spaceEfficiency: string;
    storageclassName: string;
    volumeNamePrefix: string;
  };
  insecureSkipVerify: boolean;
  secret?: {
    name?: string;
    namespace?: string;
  };
};

export type IBMFlashSystemKind = {
  spec: IBMFlashSystemSpec;
  status?: IBMFlashSystemStatus;
} & K8sResourceCommon;

export type FlashSystemState = {
  username: string;
  password: string;
  endpoint: string;
  poolname: string;
  volmode: string;
};
