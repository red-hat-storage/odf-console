import { BucketClassKind, ObjectBucketClaimKind } from '@odf/core/types';
import { K8sResourceKind } from '@odf/shared/types';

export type ReplicationResources = {
  bucketClass: BucketClassKind;
  objectBucketClaim: ObjectBucketClaimKind;
};

export type LogReplicationInfo = {
  logLocation: string;
  logPrefix: string;
};

export type State = {
  name: string;
  scName: string;
  scProvisioner: string;
  sizeValue: string;
  sizeUnit: string;
  progress: boolean;
  error: string;
  payload: K8sResourceKind;
  bucketClass: string;
  replicationRuleFormData: ReplicationRuleFormData[];
  logReplicationInfo: LogReplicationInfo;
};

export type ReplicationPolicy = {
  rules: OBCReplicationRules[];
  log_replication_info?: OBCLogReplicationInfo;
};

// Actual format of LogReplicationInfo in replication policy
// https://github.com/MeridianExplorer/noobaa-core/blob/log-replication-bg-worker/src/api/bucket_api.js#L1401
export type OBCLogReplicationInfo = {
  logs_location: {
    logs_bucket: string;
    prefix: string;
  };
};
// This is the actual format of replication rules in an OBC CRD
export type OBCReplicationRules = {
  ruleId: string;
  destination_bucket: string;
  filter?: {
    prefix: string;
  };
  sync_deletions?: boolean;
};

// Structure for the form in OBC creation page
export type ReplicationRuleFormData = {
  // Keeping it ruleNumber here instead of rule id since we are counting the rules in UI instead of any random string
  ruleNumber?: number;
  namespaceStore: string;
  prefix?: string;
  syncDeletion?: boolean;
};

export const defaultState = {
  name: '',
  scName: '',
  scProvisioner: '',
  progress: false,
  error: '',
  payload: {},
  sizeUnit: 'GiB',
  sizeValue: '',
  bucketClass: 'noobaa-default-bucket-class',
  replicationRuleFormData: [],
  logReplicationInfo: { logLocation: '', logPrefix: '' },
};

export type Action =
  | { type: 'setName'; name: string }
  | { type: 'setStorage'; name: string }
  | { type: 'setProvisioner'; name: string }
  | { type: 'setProgress' }
  | { type: 'unsetProgress' }
  | { type: 'setError'; message: string }
  | { type: 'setPayload'; payload: {} }
  | { type: 'setSize'; unit: string; value: string }
  | { type: 'setBucketClass'; name: string }
  | {
      type: 'setReplicationRuleFormData';
      data: Array<ReplicationRuleFormData>;
    }
  | {
      type: 'setLogReplicationInfo';
      data: LogReplicationInfo;
    };

export const commonReducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'setName':
      return Object.assign({}, state, { name: action.name });
    case 'setStorage':
      return Object.assign({}, state, { scName: action.name });
    case 'setProvisioner':
      return Object.assign({}, state, { scProvisioner: action.name });
    case 'setProgress':
      return Object.assign({}, state, { progress: true });
    case 'unsetProgress':
      return Object.assign({}, state, { progress: false });
    case 'setError':
      return Object.assign({}, state, { error: action.message });
    case 'setSize':
      return Object.assign({}, state, {
        sizeUnit: action.unit,
        sizeValue: action.value,
      });
    case 'setPayload':
      return Object.assign({}, state, { payload: action.payload });
    case 'setBucketClass':
      return Object.assign({}, state, { bucketClass: action.name });
    case 'setReplicationRuleFormData':
      return Object.assign({}, state, { replicationRuleFormData: action.data });
    case 'setLogReplicationInfo':
      return Object.assign({}, state, { logReplicationInfo: action.data });
    default:
      return defaultState;
  }
};
