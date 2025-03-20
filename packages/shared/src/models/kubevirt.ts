import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const VirtualMachineModel: K8sModel = {
  label: 'VirtualMachine',
  labelPlural: 'VirtualMachines',
  apiVersion: 'v1',
  apiGroup: 'kubevirt.io',
  plural: 'virtualmachines',
  abbr: 'VM',
  namespaced: true,
  kind: 'VirtualMachine',
  crd: true,
};
