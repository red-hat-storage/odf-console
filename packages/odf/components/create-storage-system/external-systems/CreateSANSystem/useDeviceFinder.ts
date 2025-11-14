import * as React from 'react';
import {
  DiscoveredDevice,
  GetDevicefinderResponse,
} from '@odf/core/types/scale';
import { ODF_PROXY_ROOT_PATH } from '@odf/shared';
import { useDeepCompareMemoize } from '@odf/shared/hooks';
import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { WizardNodeState } from '../../reducer';

const initiateDeviceFinder = async () => {
  await consoleFetch(
    `${ODF_PROXY_ROOT_PATH}/ux-backend-server/cnsa/devicefinder`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        namespace: 'openshift-storage',
      }),
    }
  );
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
    if (!grouped[dd.WWN]) {
      grouped[dd.WWN] = [];
    }
    grouped[dd.WWN].push(dd);
  }

  const sharedGroups = Object.entries(grouped).filter(
    ([, dds]) => Array.isArray(dds) && dds.length === allNodes.length
  ) as [string, DiscoveredDevice[]][];

  const reps = sharedGroups.map(([, dds]) => dds[0]);

  // ensure uniqueness by WWN
  const uniqueReps: DiscoveredDevice[] = [];
  const seen = new Set<string>();

  for (const r of reps) {
    if (!seen.has(r.WWN)) {
      seen.add(r.WWN);
      uniqueReps.push(r);
    }
  }

  return uniqueReps;
};
// --------------------------------------------

export const useDeviceFinder = (selectedNodes?: WizardNodeState[]) => {
  const [deviceFinderResponse, setDeviceFinderResponse] =
    React.useState<GetDevicefinderResponse | null>(null);
  const [deviceFinderError, setDeviceFinderError] =
    React.useState<Error | null>(null);
  const [deviceFinderLoading, setDeviceFinderLoading] = React.useState(true);

  const memoizedSelectedNodes = useDeepCompareMemoize(selectedNodes, true);
  React.useEffect(() => {
    if (!_.isEmpty(memoizedSelectedNodes)) {
      // Get hostname label values from selected nodes
      const selectedHostnames =
        // The filter(Boolean) is required to remove any undefined or falsy hostnames
        // from the array, in case some selected nodes do not have the 'kubernetes.io/hostname' label.
        // This ensures only valid hostnames are included in the device finder request payload.
        memoizedSelectedNodes
          ?.map((node) => node.labels?.['kubernetes.io/hostname'])
          .filter(Boolean) || [];
      // Call devicefinder with a PUT request to update selected hostnames
      if (selectedHostnames.length > 0) {
        const payload = {
          namespace: 'openshift-storage',
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

        // No await since useEffect cannot be async; fire and forget
        consoleFetch(
          `${ODF_PROXY_ROOT_PATH}/ux-backend-server/cnsa/devicefinder`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );
      }
    }
  }, [memoizedSelectedNodes]);

  // NEW: expose shared devices
  const [sharedDevices, setSharedDevices] = React.useState<DiscoveredDevice[]>(
    []
  );

  React.useEffect(() => {
    initiateDeviceFinder();
  }, []);

  React.useEffect(() => {
    const fetchDeviceFinder = async () => {
      try {
        const response = await consoleFetch(
          `${ODF_PROXY_ROOT_PATH}/ux-backend-server/cnsa/devicefinder`
        );
        const data = await response.json();
        setDeviceFinderResponse(data);

        const shared = getSharedDiscoveredDevicesRepresentatives(data);
        setSharedDevices(shared);
      } catch (error) {
        setDeviceFinderError(error as Error);
      } finally {
        setDeviceFinderLoading(false);
      }
    };

    const intervalId = setInterval(() => {
      fetchDeviceFinder();
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [setDeviceFinderResponse, setDeviceFinderError, setDeviceFinderLoading]);

  return {
    deviceFinderResponse,
    deviceFinderError,
    deviceFinderLoading,
    sharedDevices,
  };
};
