import * as React from 'react';
import {
  getDiscoveredDeviceKey,
  getTolerationsFromNodes,
} from '@odf/core/components/utils';
import { NodeType } from '@odf/core/constants';
import {
  DiscoveredDevice,
  GetDevicefinderResponse,
} from '@odf/core/types/scale';
import { UX_BACKEND_PROXY_ROOT_PATH } from '@odf/shared';
import { useDeepCompareMemoize } from '@odf/shared/hooks';
import { Toleration } from '@odf/shared/types';
import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { WizardNodeState } from '../../reducer';

const DEVICE_FINDER_ENDPOINT = `${UX_BACKEND_PROXY_ROOT_PATH}/cnsa/devicefinder`;

// Builds the shared devicefinder request body so the POST and PUT bodies cannot
// drift. Tolerations are included only when present so the common no-taint case
// sends the exact body as before (and matches the backend's omitempty).
export const buildDiscoveryRequestBody = (
  selectedHostnames: string[],
  tolerations: Toleration[] = []
) => ({
  nodeSelector: {
    nodeSelectorTerms: [
      {
        matchExpressions: [
          {
            key: 'kubernetes.io/hostname',
            operator: 'In',
            values: selectedHostnames,
          },
        ],
      },
    ],
  },
  ...(tolerations.length > 0 && { tolerations }),
});

// Starts devicefinder on disk-node hostnames only.
const initiateDeviceFinder = async (
  selectedHostnames: string[],
  tolerations: Toleration[]
) => {
  await consoleFetch(DEVICE_FINDER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      buildDiscoveryRequestBody(selectedHostnames, tolerations)
    ),
  });
};

const makeDiscoveredDevicesWithNodeName = (
  response: GetDevicefinderResponse
): DiscoveredDevice[] => {
  return Object.entries(response.devices).flatMap(([nodeName, nodeData]) =>
    nodeData.discoveredDevices.map((dd) => ({
      ...dd,
      nodeName,
    }))
  );
};

const getSharedDiscoveredDevicesRepresentatives = (
  response: GetDevicefinderResponse
) => {
  const allNodes = Object.keys(response.devices);
  const discovered = makeDiscoveredDevicesWithNodeName(response);

  const grouped: Record<string, DiscoveredDevice[]> = {};

  for (const dd of discovered) {
    const key = getDiscoveredDeviceKey(dd);
    if (key) {
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(dd);
    }
  }

  const sharedGroups = Object.entries(grouped).filter(([, dds]) => {
    if (!Array.isArray(dds) || dds.length === 0) {
      return false;
    }
    const uniqueNodes = new Set(dds.map((dd) => dd.nodeName));
    return uniqueNodes.size === allNodes.length;
  }) as [string, DiscoveredDevice[]][];

  return sharedGroups.map(([, dds]) => dds[0]);
};

export const useDeviceFinder = (selectedNodes?: WizardNodeState[]) => {
  const [deviceFinderResponse, setDeviceFinderResponse] =
    React.useState<GetDevicefinderResponse | null>(null);
  const [deviceFinderError, setDeviceFinderError] =
    React.useState<Error | null>(null);
  const [deviceFinderLoading, setDeviceFinderLoading] = React.useState(true);

  const memoizedSelectedNodes = useDeepCompareMemoize(selectedNodes, true);
  const discoveryStartedRef = React.useRef(false);
  const [pollingEnabled, setPollingEnabled] = React.useState(
    !Array.isArray(selectedNodes)
  );

  // NEW: expose shared devices
  const [sharedDevices, setSharedDevices] = React.useState<DiscoveredDevice[]>(
    []
  );

  React.useEffect(() => {
    // LUN discovery runs on disk nodes only.
    const diskNodes =
      memoizedSelectedNodes?.filter(
        (node) => node.localClusterRole === NodeType.DISK
      ) ?? [];
    if (!_.isEmpty(diskNodes)) {
      // Get hostname label values from selected nodes
      const selectedHostnames =
        // The filter(Boolean) is required to remove any undefined or falsy hostnames
        // from the array, in case some selected nodes do not have the 'kubernetes.io/hostname' label.
        // This ensures only valid hostnames are included in the device finder request payload.
        diskNodes
          ?.map((node) => node.labels?.['kubernetes.io/hostname'])
          .filter(Boolean) || [];
      // Tolerate the taints on the disk nodes so the devicefinder daemonset can
      // schedule onto them (it runs on these nodes only).
      const tolerations = getTolerationsFromNodes(diskNodes);
      if (selectedHostnames.length > 0) {
        if (!discoveryStartedRef.current) {
          discoveryStartedRef.current = true;
          initiateDeviceFinder(selectedHostnames, tolerations)
            .then(() => setPollingEnabled(true))
            .catch((error) => {
              discoveryStartedRef.current = false;
              setDeviceFinderError(error as Error);
              setDeviceFinderLoading(false);
            });
          return;
        }

        // Call devicefinder with a PUT request to update selected hostnames
        const payload = buildDiscoveryRequestBody(
          selectedHostnames,
          tolerations
        );

        consoleFetch(DEVICE_FINDER_ENDPOINT, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
          .then(() => setPollingEnabled(true))
          .catch((error) => {
            setDeviceFinderError(error as Error);
          });
        return;
      }
    }
    if (discoveryStartedRef.current) {
      setSharedDevices([]);
      setDeviceFinderError(null);
      setPollingEnabled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedSelectedNodes]);

  // Initialize device finder and wait for completion before starting polling
  React.useEffect(() => {
    if (!pollingEnabled) {
      return;
    }
    if (
      discoveryStartedRef.current &&
      !memoizedSelectedNodes?.some(
        (node) =>
          node.localClusterRole === NodeType.DISK &&
          node.labels?.['kubernetes.io/hostname']
      )
    ) {
      setSharedDevices([]);
      setDeviceFinderLoading(false);
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const fetchDeviceFinder = async () => {
      try {
        const response = await consoleFetch(DEVICE_FINDER_ENDPOINT);
        const data = await response.json();
        if (isMounted) {
          setDeviceFinderResponse(data);

          const shared = getSharedDiscoveredDevicesRepresentatives(data);
          setSharedDevices(shared);
        }
      } catch (error) {
        if (isMounted) {
          setDeviceFinderError(error as Error);
        }
      } finally {
        if (isMounted) {
          setDeviceFinderLoading(false);
        }
      }
    };

    // Fetch immediately after initialization
    fetchDeviceFinder();

    // Then set up interval for subsequent polls
    intervalId = setInterval(() => {
      fetchDeviceFinder();
    }, 5000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pollingEnabled, memoizedSelectedNodes]);

  return {
    deviceFinderResponse,
    deviceFinderError,
    deviceFinderLoading,
    sharedDevices,
  };
};
