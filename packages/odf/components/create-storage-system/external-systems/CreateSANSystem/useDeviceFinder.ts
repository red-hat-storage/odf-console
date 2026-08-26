import * as React from 'react';
import { getDiscoveredDeviceKey } from '@odf/core/components/utils';
import { NodeType } from '@odf/core/constants';
import {
  DiscoveredDevice,
  GetDevicefinderResponse,
} from '@odf/core/types/scale';
import { UX_BACKEND_PROXY_ROOT_PATH } from '@odf/shared';
import { useDeepCompareMemoize } from '@odf/shared/hooks';
import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { WizardNodeState } from '../../reducer';

const DEVICE_FINDER_ENDPOINT = `${UX_BACKEND_PROXY_ROOT_PATH}/cnsa/devicefinder`;

// Starts devicefinder on disk-node hostnames only.
const initiateDeviceFinder = async (selectedHostnames: string[]) => {
  await consoleFetch(DEVICE_FINDER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
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
    }),
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
  const [pollingEnabled, setPollingEnabled] = React.useState(false);

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
      if (selectedHostnames.length > 0) {
        if (!discoveryStartedRef.current) {
          discoveryStartedRef.current = true;
          initiateDeviceFinder(selectedHostnames)
            .then(() => setPollingEnabled(true))
            .catch((error) => {
              discoveryStartedRef.current = false;
              setDeviceFinderError(error as Error);
              setDeviceFinderLoading(false);
            });
          return;
        }

        // Call devicefinder with a PUT request to update selected hostnames
        const payload = {
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
        };

        consoleFetch(DEVICE_FINDER_ENDPOINT, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }).catch((error) => {
          setDeviceFinderError(error as Error);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedSelectedNodes]);

  // NEW: expose shared devices
  const [sharedDevices, setSharedDevices] = React.useState<DiscoveredDevice[]>(
    []
  );

  // Initialize device finder and wait for completion before starting polling
  React.useEffect(() => {
    if (!pollingEnabled) {
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
  }, [pollingEnabled]);

  return {
    deviceFinderResponse,
    deviceFinderError,
    deviceFinderLoading,
    sharedDevices,
  };
};
