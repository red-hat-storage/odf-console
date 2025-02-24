import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { SearchResultItemType } from './acm';

// ACM search API compatibile fields
export type VirtualMachineKind = K8sResourceCommon & SearchResultItemType;
