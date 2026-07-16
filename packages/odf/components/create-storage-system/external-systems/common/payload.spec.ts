import { SCALE_DAEMON_NODE_LABEL } from '@odf/core/constants';
import { NodeModel } from '@odf/shared';
import { Patch } from '@openshift-console/dynamic-plugin-sdk';
import { WizardNodeState } from '../../reducer';
import {
  labelNodes,
  createScaleLocalClusterPayload,
  ExternalKMMRegistryConfig,
} from './payload';

const LABEL_PATH = '/metadata/labels/scale.spectrum.ibm.com~1daemon-selector';
const NODE_ROLE_LABEL_PATH = '/metadata/labels/node-role';

const getDaemonPatchCalls = () =>
  mockK8sPatchByName.mock.calls.filter((call) =>
    (call[3] as Patch[]).some((op) => op.path === LABEL_PATH)
  );

const getNodeRolePatchCalls = () =>
  mockK8sPatchByName.mock.calls.filter((call) =>
    (call[3] as Patch[]).some((op) => op.path === NODE_ROLE_LABEL_PATH)
  );

const mockK8sPatchByName = jest.fn().mockResolvedValue({});
const mockK8sCreate = jest.fn().mockResolvedValue({});

jest.mock('@odf/shared/utils', () => ({
  ...jest.requireActual('@odf/shared/utils'),
  k8sPatchByName: (...args: unknown[]) => mockK8sPatchByName(...args),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  k8sCreate: (...args: unknown[]) => mockK8sCreate(...args),
}));

describe('payload', () => {
  beforeEach(() => {
    mockK8sPatchByName.mockClear();
  });

  describe('labelNodes', () => {
    it('should not call k8sPatchByName when nodes array is empty', async () => {
      const execute = labelNodes([]);
      await execute();
      expect(mockK8sPatchByName).not.toHaveBeenCalled();
    });

    it('should use only "add" patch operations for daemon-selector labels', async () => {
      const nodes: WizardNodeState[] = [
        {
          name: 'node-1',
          hostName: 'node-1',
          cpu: '4',
          memory: '8Gi',
          zone: 'zone-a',
          rack: 'rack-1',
          uid: 'uid-1',
          roles: [],
          labels: { 'existing.io/label': 'value' },
          taints: [],
          architecture: 'amd64',
          localClusterRole: 'disk-node',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      getDaemonPatchCalls().forEach((call) => {
        (call[3] as Patch[]).forEach((op) => {
          expect(op.op).toBe('add');
        });
      });
    });

    it('should always include the IBM daemon-selector label in every node patch', async () => {
      const nodes: WizardNodeState[] = [
        {
          name: 'node-1',
          hostName: 'node-1',
          cpu: '4',
          memory: '8Gi',
          zone: '',
          rack: '',
          uid: 'uid-1',
          roles: [],
          labels: undefined,
          taints: [],
          architecture: 'amd64',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      const patch: Patch[] = mockK8sPatchByName.mock.calls[0][3];
      const daemonSelectorOp = patch.find(
        (p) => p.path === LABEL_PATH && p.op === 'add'
      );
      expect(daemonSelectorOp).toBeDefined();
      expect(daemonSelectorOp).toMatchObject({
        op: 'add',
        path: LABEL_PATH,
        value: '',
      });
    });

    it('should add /metadata/labels when node has no labels', async () => {
      const nodes: WizardNodeState[] = [
        {
          name: 'node-no-labels',
          hostName: 'node-no-labels',
          cpu: '2',
          memory: '4Gi',
          zone: '',
          rack: '',
          uid: 'uid-no-labels',
          roles: [],
          labels: undefined,
          taints: [],
          architecture: 'amd64',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(2);
      expect(getDaemonPatchCalls()).toHaveLength(1);
      expect(getDaemonPatchCalls()[0]).toEqual([
        NodeModel,
        'node-no-labels',
        null,
        expect.arrayContaining([
          { op: 'add', path: '/metadata/labels', value: {} },
          { op: 'add', path: LABEL_PATH, value: '' },
        ]),
      ]);
      const daemonPatch: Patch[] = getDaemonPatchCalls()[0][3];
      expect(daemonPatch).toHaveLength(2);
    });

    it('should not add /metadata/labels when node already has labels so existing labels are not replaced by {}', async () => {
      const nodes: WizardNodeState[] = [
        {
          name: 'node-with-labels',
          hostName: 'node-with-labels',
          cpu: '4',
          memory: '8Gi',
          zone: 'zone-a',
          rack: 'rack-1',
          uid: 'uid-with-labels',
          roles: [],
          labels: {
            'kubernetes.io/hostname': 'node-with-labels',
            'node-role.kubernetes.io/worker': '',
          },
          taints: [],
          architecture: 'amd64',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      const patch: Patch[] = mockK8sPatchByName.mock.calls[0][3];
      expect(patch).toHaveLength(1);
      expect(patch[0]).toEqual({
        op: 'add',
        path: LABEL_PATH,
        value: '',
      });
      expect(patch.some((p) => p.path === '/metadata/labels')).toBe(false);
      expect(patch.every((p) => p.op === 'add')).toBe(true);
    });

    it('should patch node with daemon-selector key but empty string value (only add daemon-selector, no /metadata/labels)', async () => {
      const nodes: WizardNodeState[] = [
        {
          name: 'node-daemon-empty',
          hostName: 'node-daemon-empty',
          cpu: '4',
          memory: '8Gi',
          zone: '',
          rack: '',
          uid: 'uid-empty',
          roles: [],
          labels: { [SCALE_DAEMON_NODE_LABEL]: '' },
          taints: [],
          architecture: 'amd64',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(2);
      expect(getDaemonPatchCalls()).toHaveLength(1);
      const daemonPatch: Patch[] = getDaemonPatchCalls()[0][3];
      expect(daemonPatch).toHaveLength(1);
      expect(daemonPatch[0]).toEqual({
        op: 'add',
        path: LABEL_PATH,
        value: '',
      });
    });

    it('should skip daemon-selector patch when node already has daemon-selector label with truthy value', async () => {
      const nodes: WizardNodeState[] = [
        {
          name: 'node-with-daemon-selector',
          hostName: 'node-with-daemon-selector',
          cpu: '4',
          memory: '8Gi',
          zone: '',
          rack: '',
          uid: 'uid-daemon',
          roles: [],
          labels: {
            [SCALE_DAEMON_NODE_LABEL]: 'applied',
          },
          taints: [],
          architecture: 'amd64',
          localClusterRole: 'disk-node',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      expect(getDaemonPatchCalls()).toHaveLength(0);
      expect(getNodeRolePatchCalls()).toHaveLength(1);
      expect(getNodeRolePatchCalls()[0][3]).toEqual([
        {
          op: 'add',
          path: NODE_ROLE_LABEL_PATH,
          value: 'disk-node',
        },
      ]);
    });

    it('should call k8sPatchByName once per node that needs the daemon-selector label (correct model and name)', async () => {
      const nodes: WizardNodeState[] = [
        {
          name: 'node-a',
          hostName: 'node-a',
          cpu: '2',
          memory: '4Gi',
          zone: '',
          rack: '',
          uid: 'uid-a',
          roles: [],
          labels: undefined,
          taints: [],
          architecture: 'amd64',
        },
        {
          name: 'node-b',
          hostName: 'node-b',
          cpu: '2',
          memory: '4Gi',
          zone: '',
          rack: '',
          uid: 'uid-b',
          roles: [],
          labels: { 'some.io/label': 'value' },
          taints: [],
          architecture: 'amd64',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      expect(getDaemonPatchCalls()).toHaveLength(2);
      expect(getDaemonPatchCalls()[0]).toEqual([
        NodeModel,
        'node-a',
        null,
        expect.any(Array),
      ]);
      expect(getDaemonPatchCalls()[1]).toEqual([
        NodeModel,
        'node-b',
        null,
        expect.any(Array),
      ]);
      expect(getNodeRolePatchCalls()).toHaveLength(2);
    });

    it('should patch only nodes that do not already have daemon-selector label', async () => {
      const nodes: WizardNodeState[] = [
        {
          name: 'node-no-labels',
          hostName: 'node-no-labels',
          cpu: '2',
          memory: '4Gi',
          zone: '',
          rack: '',
          uid: 'uid-1',
          roles: [],
          labels: undefined,
          taints: [],
          architecture: 'amd64',
        },
        {
          name: 'node-with-other-labels',
          hostName: 'node-with-other-labels',
          cpu: '2',
          memory: '4Gi',
          zone: '',
          rack: '',
          uid: 'uid-2',
          roles: [],
          labels: { 'custom.io/label': 'keep-me' },
          taints: [],
          architecture: 'amd64',
        },
        {
          name: 'node-with-daemon-selector',
          hostName: 'node-with-daemon-selector',
          cpu: '2',
          memory: '4Gi',
          zone: '',
          rack: '',
          uid: 'uid-3',
          roles: [],
          labels: { [SCALE_DAEMON_NODE_LABEL]: 'applied' },
          taints: [],
          architecture: 'amd64',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      expect(getDaemonPatchCalls()).toHaveLength(2);
      expect(getNodeRolePatchCalls()).toHaveLength(3);

      const patch1: Patch[] = getDaemonPatchCalls()[0][3];
      const patch2: Patch[] = getDaemonPatchCalls()[1][3];

      [patch1, patch2].forEach((p) => {
        const daemonOp = p.find(
          (op) => op.op === 'add' && op.path === LABEL_PATH
        );
        expect(daemonOp).toBeDefined();
        expect(daemonOp).toMatchObject({ value: '' });
      });

      expect(patch1).toHaveLength(2);
      expect(patch2).toHaveLength(1);
      expect(patch1.some((op) => op.path === '/metadata/labels')).toBe(true);
      expect(patch2.some((op) => op.path === '/metadata/labels')).toBe(false);
    });

    it('should return a function that resolves to Promise.all of patch requests', async () => {
      const resolved = { metadata: { name: 'patched' } };
      mockK8sPatchByName.mockResolvedValue(resolved);

      const nodes: WizardNodeState[] = [
        {
          name: 'node-1',
          hostName: 'node-1',
          cpu: '2',
          memory: '4Gi',
          zone: '',
          rack: '',
          uid: 'uid-1',
          roles: [],
          labels: undefined,
          taints: [],
          architecture: 'amd64',
        },
      ];
      const execute = labelNodes(nodes);
      const result = await execute();

      expect(result).toEqual([resolved, resolved]);
    });

    it('should patch node-role from localClusterRole', async () => {
      const nodes: WizardNodeState[] = [
        {
          name: 'node-disk',
          hostName: 'node-disk',
          cpu: '2',
          memory: '4Gi',
          zone: '',
          rack: '',
          uid: 'uid-disk',
          roles: [],
          labels: { 'some.io/label': 'value' },
          taints: [],
          architecture: 'amd64',
          localClusterRole: 'disk-node',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      expect(getNodeRolePatchCalls()).toHaveLength(1);
      expect(getNodeRolePatchCalls()[0][3]).toEqual([
        {
          op: 'add',
          path: NODE_ROLE_LABEL_PATH,
          value: 'disk-node',
        },
      ]);
    });

    it('should use replace for node-role when label already exists', async () => {
      const nodes: WizardNodeState[] = [
        {
          name: 'node-cluster',
          hostName: 'node-cluster',
          cpu: '2',
          memory: '4Gi',
          zone: '',
          rack: '',
          uid: 'uid-cluster',
          roles: [],
          labels: { 'node-role': 'disk-node' },
          taints: [],
          architecture: 'amd64',
          localClusterRole: 'cluster-node',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      expect(getNodeRolePatchCalls()[0][3]).toEqual([
        {
          op: 'replace',
          path: NODE_ROLE_LABEL_PATH,
          value: 'cluster-node',
        },
      ]);
    });
  });

  describe('createScaleLocalClusterPayload', () => {
    beforeEach(() => {
      mockK8sCreate.mockClear();
    });

    it('should not set gpfsModuleManagement when externalKmmRegistry is undefined', async () => {
      const execute = createScaleLocalClusterPayload();
      await execute();

      expect(mockK8sCreate).toHaveBeenCalledTimes(1);
      const payload = mockK8sCreate.mock.calls[0][0].data;
      expect(payload.spec.gpfsModuleManagement).toBeUndefined();
    });

    it('should set gpfsModuleManagement with empty kmm when only secretKey is provided (no image registry, no secure boot)', async () => {
      const config: ExternalKMMRegistryConfig = {
        secretKey: 'my-secret',
      };
      const execute = createScaleLocalClusterPayload(config);
      await execute();

      expect(mockK8sCreate).toHaveBeenCalledTimes(1);
      const payload = mockK8sCreate.mock.calls[0][0].data;
      expect(payload.spec.gpfsModuleManagement).toEqual({ kmm: {} });
      expect(
        payload.spec.gpfsModuleManagement?.kmm?.imageRepository
      ).toBeUndefined();
      expect(
        payload.spec.gpfsModuleManagement?.kmm?.moduleSigning
      ).toBeUndefined();
    });

    it('should set imageRepository only when both imageRegistryUrl and imageRepositoryName are provided', async () => {
      const config: ExternalKMMRegistryConfig = {
        imageRegistryUrl: 'https://quay.io',
        imageRepositoryName: 'my-repo',
        secretKey: 'reg-secret',
      };
      const execute = createScaleLocalClusterPayload(config);
      await execute();

      expect(mockK8sCreate).toHaveBeenCalledTimes(1);
      const payload = mockK8sCreate.mock.calls[0][0].data;
      expect(payload.spec.gpfsModuleManagement?.kmm?.imageRepository).toEqual({
        registry: 'https://quay.io',
        repo: 'my-repo',
        registrySecret: 'reg-secret',
      });
      expect(
        payload.spec.gpfsModuleManagement?.kmm?.moduleSigning
      ).toBeUndefined();
    });

    it('should set moduleSigning only when both caCertificateSecret and privateKeySecret are provided (secure boot)', async () => {
      const config: ExternalKMMRegistryConfig = {
        secretKey: 'reg-secret',
        caCertificateSecret: 'ca-secret',
        privateKeySecret: 'key-secret',
      };
      const execute = createScaleLocalClusterPayload(config);
      await execute();

      expect(mockK8sCreate).toHaveBeenCalledTimes(1);
      const payload = mockK8sCreate.mock.calls[0][0].data;
      expect(payload.spec.gpfsModuleManagement?.kmm?.moduleSigning).toEqual({
        keySecret: 'key-secret',
        certSecret: 'ca-secret',
      });
      expect(
        payload.spec.gpfsModuleManagement?.kmm?.imageRepository
      ).toBeUndefined();
    });

    it('should not set moduleSigning when only one of caCertificateSecret or privateKeySecret is provided (no secure boot)', async () => {
      const configOnlyCa: ExternalKMMRegistryConfig = {
        secretKey: 'reg-secret',
        caCertificateSecret: 'ca-secret',
      };
      const executeOnlyCa = createScaleLocalClusterPayload(configOnlyCa);
      await executeOnlyCa();

      let payload = mockK8sCreate.mock.calls[0][0].data;
      expect(
        payload.spec.gpfsModuleManagement?.kmm?.moduleSigning
      ).toBeUndefined();

      mockK8sCreate.mockClear();
      const configOnlyKey: ExternalKMMRegistryConfig = {
        secretKey: 'reg-secret',
        privateKeySecret: 'key-secret',
      };
      const executeOnlyKey = createScaleLocalClusterPayload(configOnlyKey);
      await executeOnlyKey();

      payload = mockK8sCreate.mock.calls[0][0].data;
      expect(
        payload.spec.gpfsModuleManagement?.kmm?.moduleSigning
      ).toBeUndefined();
    });

    it('should set both imageRepository and moduleSigning when all fields provided (registry + secure boot)', async () => {
      const config: ExternalKMMRegistryConfig = {
        imageRegistryUrl: 'https://quay.io',
        imageRepositoryName: 'my-repo',
        secretKey: 'reg-secret',
        caCertificateSecret: 'ca-secret',
        privateKeySecret: 'key-secret',
      };
      const execute = createScaleLocalClusterPayload(config);
      await execute();

      expect(mockK8sCreate).toHaveBeenCalledTimes(1);
      const payload = mockK8sCreate.mock.calls[0][0].data;
      expect(payload.spec.gpfsModuleManagement?.kmm?.imageRepository).toEqual({
        registry: 'https://quay.io',
        repo: 'my-repo',
        registrySecret: 'reg-secret',
      });
      expect(payload.spec.gpfsModuleManagement?.kmm?.moduleSigning).toEqual({
        keySecret: 'key-secret',
        certSecret: 'ca-secret',
      });
    });

    it('should not add cluster labels when addClusterLabels is false or undefined', async () => {
      const execute = createScaleLocalClusterPayload();
      await execute();

      expect(mockK8sCreate).toHaveBeenCalledTimes(1);
      const payload = mockK8sCreate.mock.calls[0][0].data;
      expect(payload.metadata.labels).toBeUndefined();
    });

    it('should add cluster labels when addClusterLabels is true', async () => {
      const execute = createScaleLocalClusterPayload(undefined, true);
      await execute();

      expect(mockK8sCreate).toHaveBeenCalledTimes(1);
      const payload = mockK8sCreate.mock.calls[0][0].data;
      expect(payload.metadata.labels).toEqual({
        'app.kubernetes.io/instance': 'ibm-spectrum-scale',
        'app.kubernetes.io/name': 'cluster',
      });
    });
  });
});
