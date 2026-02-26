import { NodeModel } from '@odf/shared';
import { Patch } from '@openshift-console/dynamic-plugin-sdk';
import { WizardNodeState } from '../../reducer';
import { labelNodes } from './payload';

const DAEMON_SELECTOR_LABEL_KEY = 'scale.spectrum.ibm.com/daemon-selector/';
const LABEL_PATH = '/metadata/labels/scale.spectrum.ibm.com~1daemon-selector';

const mockK8sPatchByName = jest.fn().mockResolvedValue({});

jest.mock('@odf/shared/utils', () => ({
  ...jest.requireActual('@odf/shared/utils'),
  k8sPatchByName: (...args: unknown[]) => mockK8sPatchByName(...args),
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

    it('should use only "add" patch operations so existing labels are never removed or replaced', async () => {
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
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      const patch: Patch[] = mockK8sPatchByName.mock.calls[0][3];
      patch.forEach((op) => {
        expect(op.op).toBe('add');
        expect(['remove', 'replace']).not.toContain(op.op);
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

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(1);
      expect(mockK8sPatchByName).toHaveBeenCalledWith(
        NodeModel,
        'node-no-labels',
        null,
        expect.arrayContaining([
          { op: 'add', path: '/metadata/labels', value: {} },
          { op: 'add', path: LABEL_PATH, value: '' },
        ])
      );
      const patch: Patch[] = mockK8sPatchByName.mock.calls[0][3];
      expect(patch).toHaveLength(2);
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
          labels: { [DAEMON_SELECTOR_LABEL_KEY]: '' },
          taints: [],
          architecture: 'amd64',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(1);
      const patch: Patch[] = mockK8sPatchByName.mock.calls[0][3];
      expect(patch).toHaveLength(1);
      expect(patch[0]).toEqual({ op: 'add', path: LABEL_PATH, value: '' });
    });

    it('should not call k8sPatchByName when node already has daemon-selector label with truthy value', async () => {
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
            [DAEMON_SELECTOR_LABEL_KEY]: 'applied',
          },
          taints: [],
          architecture: 'amd64',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      expect(mockK8sPatchByName).not.toHaveBeenCalled();
    });

    it('should call k8sPatchByName once per node that needs the label (correct model and name)', async () => {
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

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(2);
      expect(mockK8sPatchByName).toHaveBeenNthCalledWith(
        1,
        NodeModel,
        'node-a',
        null,
        expect.any(Array)
      );
      expect(mockK8sPatchByName).toHaveBeenNthCalledWith(
        2,
        NodeModel,
        'node-b',
        null,
        expect.any(Array)
      );
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
          labels: { [DAEMON_SELECTOR_LABEL_KEY]: 'applied' },
          taints: [],
          architecture: 'amd64',
        },
      ];
      const execute = labelNodes(nodes);
      await execute();

      expect(mockK8sPatchByName).toHaveBeenCalledTimes(2);

      const patch1: Patch[] = mockK8sPatchByName.mock.calls[0][3];
      const patch2: Patch[] = mockK8sPatchByName.mock.calls[1][3];

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

      expect(result).toEqual([resolved]);
    });
  });
});
