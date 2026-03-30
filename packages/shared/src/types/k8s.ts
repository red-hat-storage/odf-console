import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  K8sKind,
  MatchExpression,
} from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { ObjectMetadata } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { K8sResourceCondition } from './common';

// The config is a JSON object with the NetworkAttachmentDefinitionConfig type stored as a string
export type NetworkAttachmentDefinitionSpec = {
  config: string;
};

export type NetworkAttachmentDefinitionKind = {
  spec?: NetworkAttachmentDefinitionSpec;
} & K8sResourceKind;

export type StorageClassResourceKind = {
  provisioner: string;
  allowVolumeExpansion?: boolean;
  reclaimPolicy: string;
  volumeBindingMode?: string;
  parameters?: {
    [key: string]: string;
  };
} & K8sResourceCommon;

export type K8sResourceKind = K8sResourceCommon & {
  spec?: {
    selector?: Selector | MatchLabels;
    [key: string]: any;
  };
  status?: { [key: string]: any };
  data?: { [key: string]: any };
};

export type Selector = {
  matchLabels?: MatchLabels;
  matchExpressions?: MatchExpression[];
};

export type MatchLabels = {
  [key: string]: string;
};

export type NodeKind = {
  spec: {
    providerID?: string;
    taints?: Taint[];
    unschedulable?: boolean;
  };
  status?: {
    addresses?: NodeAddress[];
    capacity?: {
      [key: string]: string;
    };
    conditions?: NodeCondition[];
    images?: {
      names: string[];
      sizeBytes?: number;
    }[];
    phase?: string;
    nodeInfo?: {
      architecture?: string;
      operatingSystem: string;
    };
  };
} & K8sResourceCommon;

export type NodeAddress = {
  type: string;
  address: string;
};

export type NodeMachineAndNamespace = {
  name: string;
  namespace: string;
};

export type SecretKind = {
  data?: { [key: string]: string };
  stringData?: { [key: string]: string };
  type?: string;
} & K8sResourceCommon;

export type ConfigMapKind = {
  data?: { [key: string]: string };
  binaryData?: { [key: string]: string };
} & K8sResourceCommon;

export type Taint = {
  key: string;
  value: string;
  effect: TaintEffect;
};

export type TaintEffect = '' | 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';

export type TolerationOperator = 'Exists' | 'Equal';

export type Toleration = {
  effect: TaintEffect;
  key?: string;
  operator: TolerationOperator;
  tolerationSeconds?: number;
  value?: string;
};

export type Patch = {
  op: string;
  path: string;
  value?: any;
};

export type NodeCondition = {
  lastHeartbeatTime?: string;
} & K8sResourceCondition;

export type PodKind = {
  status?: PodStatus;
} & K8sResourceCommon &
  PodTemplate;

export type GetAPIVersionForModel = (model: K8sKind) => string;

enum ImagePullPolicy {
  Always = 'Always',
  Never = 'Never',
  IfNotPresent = 'IfNotPresent',
}

// https://github.com/kubernetes/api/blob/release-1.16/core/v1/types.go#L2411-L2432
export enum PodPhase {
  Pending = 'Pending',
  Failed = 'Failed',
  Running = 'Running',
  Succeeded = 'Succeeded',
  Unknown = 'Unknown',
}

type VolumeMount = {
  mountPath: string;
  mountPropagation?: 'None' | 'HostToContainer' | 'Bidirectional';
  name: string;
  readOnly?: boolean;
  subPath?: string;
  subPathExpr?: string;
};

type VolumeDevice = {
  devicePath: string;
  name: string;
};

type EnvVarSource = {
  fieldRef?: {
    apiVersion?: string;
    fieldPath: string;
  };
  resourceFieldRef?: {
    resource: string;
    containerName?: string;
    divisor?: string;
  };
  configMapKeyRef?: {
    key: string;
    name: string;
  };
  secretKeyRef?: {
    key: string;
    name: string;
  };
  configMapRef?: {
    key?: string;
    name: string;
  };
  secretRef?: {
    key?: string;
    name: string;
  };
  configMapSecretRef?: {
    key?: string;
    name: string;
  };
  serviceAccountRef?: {
    key?: string;
    name: string;
  };
};

type EnvVar = {
  name: string;
  value?: string;
  valueFrom?: EnvVarSource;
};

type ProbePort = string | number;

type ExecProbe = {
  command: string[];
};

type HTTPGetProbe = {
  path?: string;
  port: ProbePort;
  host?: string;
  scheme: 'HTTP' | 'HTTPS';
  httpHeaders?: any[];
};

type TCPSocketProbe = {
  port: ProbePort;
  host?: string;
};

type Handler = {
  exec?: ExecProbe;
  httpGet?: HTTPGetProbe;
  tcpSocket?: TCPSocketProbe;
};

type ContainerProbe = {
  initialDelaySeconds?: number;
  timeoutSeconds?: number;
  periodSeconds?: number;
  successThreshold?: number;
  failureThreshold?: number;
} & Handler;

type ContainerLifecycle = {
  postStart?: Handler;
  preStop?: Handler;
};

type ResourceList = {
  [resourceName: string]: string;
};

type ContainerPort = {
  name?: string;
  containerPort: number;
  protocol: string;
};

type ContainerSpec = {
  name: string;
  volumeMounts?: VolumeMount[];
  volumeDevices?: VolumeDevice[];
  env?: EnvVar[];
  livenessProbe?: ContainerProbe;
  readinessProbe?: ContainerProbe;
  lifecycle?: ContainerLifecycle;
  resources?: {
    limits?: ResourceList;
    requested?: ResourceList;
  };
  ports?: ContainerPort[];
  imagePullPolicy?: ImagePullPolicy;
  [key: string]: any;
};

type Volume = {
  name: string;
  [key: string]: any;
};

type PodSpec = {
  volumes?: Volume[];
  initContainers?: ContainerSpec[];
  containers: ContainerSpec[];
  restartPolicy?: 'Always' | 'OnFailure' | 'Never';
  terminationGracePeriodSeconds?: number;
  activeDeadlineSeconds?: number;
  nodeSelector?: any;
  serviceAccountName?: string;
  priorityClassName?: string;
  tolerations?: Toleration[];
  nodeName?: string;
  hostname?: string;
  [key: string]: any;
};

type PodTemplate = {
  metadata: ObjectMetadata;
  spec: PodSpec;
};

type PodCondition = {
  lastProbeTime?: string;
} & K8sResourceCondition;

type PodStatus = {
  phase: keyof typeof PodPhase;
  conditions?: PodCondition[];
  message?: string;
  reason?: string;
  startTime?: string;
  initContainerStatuses?: ContainerStatus[];
  containerStatuses?: ContainerStatus[];
  [key: string]: any;
};

type ContainerStateValue = {
  reason?: string;
  [key: string]: any;
};

type ContainerState = {
  waiting?: ContainerStateValue;
  running?: ContainerStateValue;
  terminated?: ContainerStateValue;
};

type ContainerStatus = {
  name: string;
  state?: ContainerState;
  lastState?: ContainerState;
  ready: boolean;
  restartCount: number;
  image: string;
  imageID: string;
  containerID?: string;
};

export type PersistentVolumeClaimKind = K8sResourceCommon & {
  spec: {
    accessModes: string[];
    resources: {
      requests: {
        storage: string;
      };
    };
    storageClassName: string;
    volumeMode?: string;
    /* Parameters in a cloned PVC */
    dataSource?: {
      name: string;
      kind: string;
      apiGroup: string;
    };
    /**/
  };
  status?: {
    phase: string;
  };
};

export type DeploymentCondition = {
  lastUpdateTime?: string;
} & K8sResourceCondition;

export type DeploymentKind = {
  spec: {
    minReadySeconds?: number;
    paused?: boolean;
    progressDeadlineSeconds?: number;
    replicas?: number;
    revisionHistoryLimit?: number;
    selector: Selector;
    strategy?: {
      rollingUpdate?: {
        maxSurge: number | string;
        maxUnavailable: number | string;
      };
      type?: string;
    };
    template: PodTemplate;
  };
  status?: {
    availableReplicas?: number;
    collisionCount?: number;
    conditions?: DeploymentCondition[];
    observedGeneration?: number;
    readyReplicas?: number;
    replicas?: number;
    unavailableReplicas?: number;
    updatedReplicas?: number;
  };
} & K8sResourceCommon;

export type ApplicationKind = K8sResourceCommon & {
  spec: {
    componentKinds: {
      group: string;
      kind: string;
    }[];
    selector?: Selector | null;
  };
  status?: {
    phase: string;
  };
};

export type Release = {
  version: string;
  image: string;
  url?: string;
  channels?: string[];
};

export type ConditionalUpdate = {
  release: Release;
  conditions: K8sResourceCondition[];
};

export type UpdateHistory = {
  state: 'Completed' | 'Partial';
  startedTime: string;
  completionTime: string;
  version: string;
  image: string;
  verified: boolean;
};

export enum ClusterVersionConditionType {
  Available = 'Available',
  Failing = 'Failing',
  Progressing = 'Progressing',
  RetrievedUpdates = 'RetrievedUpdates',
  Invalid = 'Invalid',
  Upgradeable = 'Upgradeable',
  ReleaseAccepted = 'ReleaseAccepted',
}

export type ClusterVersionCondition = {
  type: keyof typeof ClusterVersionConditionType;
} & K8sResourceCondition;

type ClusterVersionStatus = {
  desired: Release;
  history: UpdateHistory[];
  observedGeneration: number;
  versionHash: string;
  conditions?: ClusterVersionCondition[];
  availableUpdates: Release[];
  conditionalUpdates?: ConditionalUpdate[];
};

type ClusterVersionSpec = {
  channel: string;
  clusterID: string;
  desiredUpdate?: Release;
  upstream?: string;
};

export type ClusterVersionKind = {
  spec: ClusterVersionSpec;
  status: ClusterVersionStatus;
} & K8sResourceCommon;

export type VolumeSnapshotClassKind = K8sResourceCommon & {
  deletionPolicy: string;
  driver: string;
};

export type VolumeGroupSnapshotClassKind = K8sResourceCommon & {
  deletionPolicy: 'Delete' | 'Retain';
  driver: string;
  parameters?: {
    [key: string]: string;
  };
};
