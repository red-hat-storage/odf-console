import { SCALE_DAEMON_NODE_LABEL } from '@odf/core/constants';
import { ClusterKind } from '@odf/core/types/scale';
import { NodeModel } from '@odf/shared';
import { Toleration } from '@odf/shared/types';
import { Patch } from '@openshift-console/dynamic-plugin-sdk';
import { WizardNodeState } from '../../reducer';
import {
  labelNodes,
  createScaleLocalClusterPayload,
  patchScaleLocalClusterTolerations,
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
          localClusterRole: 'disk-node',
        },
      ];
      const execute = labelNodes(nodes, true);
      await execute();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(1);
      expect(getDaemonPatchCalls()).toHaveLength(1);
      expect(getNodeRolePatchCalls()).toHaveLength(1);
      expect(mockK8sPatchByName.mock.calls[0]).toEqual([
        NodeModel,
        'node-no-labels',
        null,
        expect.arrayContaining([
          { op: 'add', path: '/metadata/labels', value: {} },
          { op: 'add', path: LABEL_PATH, value: '' },
          { op: 'add', path: NODE_ROLE_LABEL_PATH, value: 'disk-node' },
        ]),
      ]);
      expect(mockK8sPatchByName.mock.calls[0][3]).toHaveLength(3);
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
          localClusterRole: 'disk-node',
        },
      ];
      const execute = labelNodes(nodes, true);
      await execute();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(1);
      expect(getDaemonPatchCalls()).toHaveLength(1);
      const patch: Patch[] = mockK8sPatchByName.mock.calls[0][3];
      expect(patch).toEqual(
        expect.arrayContaining([
          { op: 'add', path: LABEL_PATH, value: '' },
          { op: 'add', path: NODE_ROLE_LABEL_PATH, value: 'disk-node' },
        ])
      );
      expect(patch.some((p) => p.path === '/metadata/labels')).toBe(false);
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
      const execute = labelNodes(nodes, true);
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
      const execute = labelNodes(nodes, true);
      await execute();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(2);
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
          localClusterRole: 'disk-node',
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
          localClusterRole: 'disk-node',
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
          localClusterRole: 'cluster-node',
        },
      ];
      const execute = labelNodes(nodes, true);
      await execute();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(3);
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

      expect(patch1.some((op) => op.path === '/metadata/labels')).toBe(true);
      expect(patch2.some((op) => op.path === '/metadata/labels')).toBe(false);
      expect(patch1).toEqual(
        expect.arrayContaining([
          { op: 'add', path: LABEL_PATH, value: '' },
          { op: 'add', path: NODE_ROLE_LABEL_PATH, value: 'disk-node' },
        ])
      );
      expect(patch2).toEqual(
        expect.arrayContaining([
          { op: 'add', path: LABEL_PATH, value: '' },
          { op: 'add', path: NODE_ROLE_LABEL_PATH, value: 'disk-node' },
        ])
      );
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
          localClusterRole: 'disk-node',
        },
      ];
      const execute = labelNodes(nodes, true);
      const result = await execute();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(1);
      expect(result).toEqual([resolved]);
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
      const execute = labelNodes(nodes, true);
      await execute();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(1);
      expect(getNodeRolePatchCalls()).toHaveLength(1);
      expect(getNodeRolePatchCalls()[0][3]).toEqual(
        expect.arrayContaining([
          {
            op: 'add',
            path: NODE_ROLE_LABEL_PATH,
            value: 'disk-node',
          },
        ])
      );
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
      const execute = labelNodes(nodes, true);
      await execute();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(1);
      expect(getNodeRolePatchCalls()[0][3]).toEqual(
        expect.arrayContaining([
          {
            op: 'replace',
            path: NODE_ROLE_LABEL_PATH,
            value: 'cluster-node',
          },
        ])
      );
    });

    it('should send a single patch containing both daemon and role label paths', async () => {
      const nodes: WizardNodeState[] = [
        {
          name: 'node-combined',
          hostName: 'node-combined',
          cpu: '2',
          memory: '4Gi',
          zone: '',
          rack: '',
          uid: 'uid-combined',
          roles: [],
          labels: undefined,
          taints: [],
          architecture: 'amd64',
          localClusterRole: 'disk-node',
        },
      ];
      const execute = labelNodes(nodes, true);
      await execute();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(1);
      const patch: Patch[] = mockK8sPatchByName.mock.calls[0][3];
      expect(patch).toEqual([
        { op: 'add', path: '/metadata/labels', value: {} },
        { op: 'add', path: LABEL_PATH, value: '' },
        { op: 'add', path: NODE_ROLE_LABEL_PATH, value: 'disk-node' },
      ]);
      expect(patch.some((op) => op.path === LABEL_PATH)).toBe(true);
      expect(patch.some((op) => op.path === NODE_ROLE_LABEL_PATH)).toBe(true);
    });

    it('should not patch node-role when patchNodeRoleLabel is false', async () => {
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

      expect(getDaemonPatchCalls()).toHaveLength(1);
      expect(getNodeRolePatchCalls()).toHaveLength(0);
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

    it('should not set spec.daemon.tolerations when tolerations are not provided', async () => {
      const execute = createScaleLocalClusterPayload();
      await execute();

      expect(mockK8sCreate).toHaveBeenCalledTimes(1);
      const payload = mockK8sCreate.mock.calls[0][0].data;
      expect(payload.spec.daemon).not.toHaveProperty('tolerations');
      expect(payload.spec.gui).toBeUndefined();
      expect(payload.spec.pmcollector).toBeUndefined();
      expect(payload.spec.grafanaBridge).not.toHaveProperty('tolerations');
    });

    it('should not set spec.daemon.tolerations when the tolerations array is empty', async () => {
      const execute = createScaleLocalClusterPayload(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        []
      );
      await execute();

      expect(mockK8sCreate).toHaveBeenCalledTimes(1);
      const payload = mockK8sCreate.mock.calls[0][0].data;
      expect(payload.spec.daemon).not.toHaveProperty('tolerations');
    });

    it('should set spec.daemon.tolerations when tolerations are provided', async () => {
      const tolerations: Toleration[] = [
        {
          key: 'dedicated',
          operator: 'Equal',
          value: 'storage',
          effect: 'NoSchedule',
        },
        {
          key: 'node.kubernetes.io/disk-pressure',
          operator: 'Exists',
          effect: 'NoExecute',
        },
      ];
      const execute = createScaleLocalClusterPayload(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        tolerations
      );
      await execute();

      expect(mockK8sCreate).toHaveBeenCalledTimes(1);
      const payload = mockK8sCreate.mock.calls[0][0].data;
      expect(payload.spec.daemon.tolerations).toEqual(tolerations);
    });

    it('should set tolerations on gui, pmcollector and grafanaBridge too (not just daemon)', async () => {
      const tolerations: Toleration[] = [
        {
          key: 'dedicated',
          operator: 'Equal',
          value: 'storage',
          effect: 'NoSchedule',
        },
      ];
      const execute = createScaleLocalClusterPayload(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        tolerations
      );
      await execute();

      expect(mockK8sCreate).toHaveBeenCalledTimes(1);
      const payload = mockK8sCreate.mock.calls[0][0].data;
      expect(payload.spec.gui.tolerations).toEqual(tolerations);
      expect(payload.spec.pmcollector.tolerations).toEqual(tolerations);
      expect(payload.spec.grafanaBridge.tolerations).toEqual(tolerations);
      // Pre-existing grafanaBridge config must be preserved alongside the toleration.
      expect(payload.spec.grafanaBridge.enablePrometheusExporter).toBe(true);
    });
  });

  describe('patchScaleLocalClusterTolerations', () => {
    // Mirrors a cluster produced by the (fixed) create payload: every
    // taint-sensitive section is present and shares the same tolerations.
    const makeCluster = (tolerations?: Toleration[]): ClusterKind =>
      ({
        apiVersion: 'scale.spectrum.ibm.com/v1beta1',
        kind: 'Cluster',
        metadata: { name: 'ibm-spectrum-scale' },
        spec: {
          daemon: { ...(tolerations ? { tolerations } : {}) },
          gui: { ...(tolerations ? { tolerations } : {}) },
          pmcollector: { ...(tolerations ? { tolerations } : {}) },
          grafanaBridge: {
            enablePrometheusExporter: true,
            ...(tolerations ? { tolerations } : {}),
          },
        },
      }) as ClusterKind;

    const taintedNode = (
      taint = { key: 'dedicated', value: 'storage', effect: 'NoSchedule' }
    ): WizardNodeState =>
      ({ name: 'node-1', taints: [taint] }) as WizardNodeState;

    it('does not patch when the added nodes carry no taints', async () => {
      await patchScaleLocalClusterTolerations(makeCluster(), [
        { name: 'node-1' } as WizardNodeState,
      ])();

      expect(mockK8sPatchByName).not.toHaveBeenCalled();
    });

    it('adds tolerations to every taint-sensitive section when the cluster has none yet', async () => {
      await patchScaleLocalClusterTolerations(makeCluster(), [taintedNode()])();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(1);
      const [model, name, namespace, patch] = mockK8sPatchByName.mock.calls[0];
      expect(model.kind).toBe('Cluster');
      expect(name).toBe('ibm-spectrum-scale');
      expect(namespace).toBeNull();
      const value = [
        {
          key: 'dedicated',
          operator: 'Equal',
          value: 'storage',
          effect: 'NoSchedule',
        },
      ];
      expect(patch).toEqual([
        { op: 'add', path: '/spec/daemon/tolerations', value },
        { op: 'add', path: '/spec/gui/tolerations', value },
        { op: 'add', path: '/spec/pmcollector/tolerations', value },
        { op: 'add', path: '/spec/grafanaBridge/tolerations', value },
      ]);
    });

    it('adds the whole section when a taint-sensitive section is missing (pre-fix cluster)', async () => {
      // A cluster created before the GUI/pmcollector/grafana-bridge sections were
      // tolerated: only `daemon` exists. The patch must add the missing sections
      // as objects (a JSON Patch `add` on `/spec/gui/tolerations` would fail when
      // `/spec/gui` does not exist).
      const preFixCluster = {
        apiVersion: 'scale.spectrum.ibm.com/v1beta1',
        kind: 'Cluster',
        metadata: { name: 'ibm-spectrum-scale' },
        spec: { daemon: {} },
      } as ClusterKind;

      await patchScaleLocalClusterTolerations(preFixCluster, [taintedNode()])();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(1);
      const patch = mockK8sPatchByName.mock.calls[0][3] as Patch[];
      const value = [
        {
          key: 'dedicated',
          operator: 'Equal',
          value: 'storage',
          effect: 'NoSchedule',
        },
      ];
      expect(patch).toEqual([
        { op: 'add', path: '/spec/daemon/tolerations', value },
        { op: 'add', path: '/spec/gui', value: { tolerations: value } },
        {
          op: 'add',
          path: '/spec/pmcollector',
          value: { tolerations: value },
        },
        {
          op: 'add',
          path: '/spec/grafanaBridge',
          value: { tolerations: value },
        },
      ]);
    });

    it('replaces and merges with the existing tolerations', async () => {
      const existing: Toleration = {
        key: 'existing',
        operator: 'Exists',
        effect: 'NoExecute',
      };
      await patchScaleLocalClusterTolerations(makeCluster([existing]), [
        taintedNode(),
      ])();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(1);
      const patch = mockK8sPatchByName.mock.calls[0][3] as Patch[];
      expect(patch[0].op).toBe('replace');
      expect(patch[0].path).toBe('/spec/daemon/tolerations');
      expect(patch[0].value).toEqual([
        existing,
        {
          key: 'dedicated',
          operator: 'Equal',
          value: 'storage',
          effect: 'NoSchedule',
        },
      ]);
    });

    it('does not patch when the node taint already exists in the cluster tolerations', async () => {
      const existing: Toleration = {
        key: 'dedicated',
        operator: 'Equal',
        value: 'storage',
        effect: 'NoSchedule',
      };
      await patchScaleLocalClusterTolerations(makeCluster([existing]), [
        taintedNode(),
      ])();

      expect(mockK8sPatchByName).not.toHaveBeenCalled();
    });

    it('patches a genuinely new toleration even when duplicates keep the merged length equal', async () => {
      // The existing list carries a duplicate, so merging a new taint de-dupes it
      // and the merged length equals the existing length. A length-based check
      // would wrongly skip the patch; identity-based detection must still patch.
      const duplicated: Toleration = {
        key: 'dedicated',
        operator: 'Equal',
        value: 'storage',
        effect: 'NoSchedule',
      };
      await patchScaleLocalClusterTolerations(
        makeCluster([duplicated, { ...duplicated }]),
        [taintedNode({ key: 'tenant', value: 'a', effect: 'NoSchedule' })]
      )();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(1);
      const patch = mockK8sPatchByName.mock.calls[0][3] as Patch[];
      expect(patch[0].op).toBe('replace');
      expect(patch[0].value).toEqual([
        duplicated,
        {
          key: 'tenant',
          operator: 'Equal',
          value: 'a',
          effect: 'NoSchedule',
        },
      ]);
    });
  });
});
