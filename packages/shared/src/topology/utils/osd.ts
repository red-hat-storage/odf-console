import { getName } from '@odf/shared/selectors';
import { NodeKind, PodKind } from '@odf/shared/types';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { OsdInformation } from '../sidebar/types';

// Constants
const OSD_LABEL_KEY = 'osd';
const NODE_ADDRESS_TYPE_INTERNAL_IP = 'InternalIP';

/**
 * Extracts OSD pod from daemon data string.
 * @param osdDaemonData - String in format "osd.{id}"
 * @param pods - Array of pod resources
 * @returns The matching pod or undefined if not found
 */
export const getPodFromOsdDaemonData = (
  osdDaemonData: string | undefined,
  pods: PodKind[]
): PodKind | undefined => {
  if (!osdDaemonData || !pods) return undefined;

  const parts = osdDaemonData.split('.');
  if (parts.length < 2) return undefined;

  const osdId = parts[1];
  return pods.find((pod) => pod?.metadata?.labels?.[OSD_LABEL_KEY] === osdId);
};

/**
 * Gets OSD information for all OSDs running on a specific node.
 * @param pods - Array of pod resources
 * @param node - Node resource
 * @param metrics - Prometheus metrics result containing OSD metadata
 * @returns Array of OSD information objects
 */
export const getOsdInformation = (
  pods: PodKind[],
  node: NodeKind,
  metrics: PrometheusResponse['data']['result']
): OsdInformation[] => {
  if (!pods || !node || !metrics) return [];

  const podsInNode = pods.filter(
    (pod) => pod?.spec?.nodeName === node?.metadata?.name
  );

  const osdPods = podsInNode.filter(
    (pod) => pod?.metadata?.labels?.[OSD_LABEL_KEY]
  );

  const metricsMap = new Map<string, string>();
  metrics.forEach((metric) => {
    const cephDaemon = metric.metric?.ceph_daemon;
    if (cephDaemon) {
      const parts = cephDaemon.split('.');
      if (parts.length >= 2) {
        const osdId = parts[1];
        const deviceClass = metric.metric?.device_class;
        if (deviceClass) {
          metricsMap.set(osdId, deviceClass);
        }
      }
    }
  });

  const nodeIP = node?.status?.addresses?.find(
    (address) => address?.type === NODE_ADDRESS_TYPE_INTERNAL_IP
  )?.address;

  return osdPods.map((pod) => {
    const osdId = pod?.metadata?.labels?.[OSD_LABEL_KEY];
    return {
      osdID: osdId,
      deviceClass: metricsMap.get(osdId),
      osdIP: pod?.status?.podIP,
      nodeIP,
      podName: getName(pod),
    };
  });
};
