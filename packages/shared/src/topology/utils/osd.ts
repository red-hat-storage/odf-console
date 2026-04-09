import { getLabel, getName } from '@odf/shared/selectors';
import { NodeKind, PodKind } from '@odf/shared/types';
import { OsdInformation } from '../sidebar/types';

// Constants
const OSD_LABEL_KEY = 'osd';
const DEVICE_CLASS_LABEL_KEY = 'device-class';
const NODE_ADDRESS_TYPE_INTERNAL_IP = 'InternalIP';

/**
 * Gets OSD information for all OSDs running on a specific node.
 * @param pods - Array of pod resources
 * @param node - Node resource
 * @param metrics - Prometheus metrics result containing OSD metadata
 * @returns Array of OSD information objects
 */
/**
 * Utility function to extract OSD ID from a string or Pod.
 * Supports "osd.{id}" string from ceph_daemon and Pod label extraction.
 */
const extractOsdId = (
  input: string | PodKind | undefined
): string | undefined => {
  if (!input) return undefined;
  if (typeof input === 'string') {
    // input like "osd.2"
    const parts = input.split('.');
    return parts.length >= 2 ? parts[1] : undefined;
  }
  // input is a PodKind
  return getLabel(input, OSD_LABEL_KEY);
};

const extractDeviceClass = (pod: PodKind): string | undefined => {
  return getLabel(pod, DEVICE_CLASS_LABEL_KEY);
};

export const getOsdInformation = (
  pods: PodKind[],
  node: NodeKind
): OsdInformation[] => {
  if (!pods || !node) return [];

  const podsInNode = pods.filter(
    (pod) => pod?.spec?.nodeName === node?.metadata?.name
  );

  const osdPods = podsInNode.filter((pod) => extractOsdId(pod));

  const metricsMap = new Map<string, string>();
  osdPods.forEach((pod) => {
    const osdId = extractOsdId(pod);
    const deviceClass = extractDeviceClass(pod);
    if (osdId && deviceClass) {
      metricsMap.set(osdId, deviceClass);
    }
  });

  const nodeIP = node?.status?.addresses?.find(
    (address) => address?.type === NODE_ADDRESS_TYPE_INTERNAL_IP
  )?.address;

  return osdPods.map((pod) => {
    const osdId = extractOsdId(pod);
    return {
      osdID: osdId,
      deviceClass: osdId ? metricsMap.get(osdId) : undefined,
      osdIP: pod?.status?.podIP,
      nodeIP,
      podName: getName(pod),
    };
  });
};
