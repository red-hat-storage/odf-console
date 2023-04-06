import {
  K8sModel,
  K8sResourceCommon,
  Alert,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import { NodeStatus } from '@patternfly/react-topology';
import { DeploymentModel, NodeModel } from '../../models';
import { getNodeStatusWithDescriptors } from '../../Nodes';
import { getName } from '../../selectors';
import { DeploymentKind } from '../../types';
import { NodeDeploymentMap } from '../Context';
import { filterRelevantAlerts, getFilteredAlerts } from './AlertFilters';
import { isCriticalAlert, isWarningAlert } from './Monitoring';

type ResourceStatus = {
  status: NodeStatus;
  message: string;
};

const getStorageClusterStatus = (
  deployments: DeploymentKind[],
  t: TFunction
) => {
  const anyUnavailableDeployment = deployments.some((resource) => {
    const availabilityStatus = (
      resource as DeploymentKind
    )?.status?.conditions?.find(
      (condition) => condition?.type === 'Available'
    )?.status;
    return availabilityStatus !== 'True';
  });
  return !anyUnavailableDeployment
    ? { status: NodeStatus.success, message: '' }
    : { status: NodeStatus.danger, message: t('Deployments are unavailable') };
};

export const getStatusWithDescriptors = (
  resourceModel: K8sModel,
  nodeDeploymentMap: NodeDeploymentMap,
  resource: K8sResourceCommon,
  alerts: Alert[],
  t: TFunction
): ResourceStatus => {
  const resourceName = getName(resource);
  const relevantAlerts = filterRelevantAlerts(
    resourceName,
    resourceModel,
    alerts
  );
  if (relevantAlerts.length > 0) {
    const message = t('Alerts are being fired');
    if (getFilteredAlerts(relevantAlerts, isCriticalAlert).length > 0) {
      return {
        status: NodeStatus.danger,
        message,
      };
    }
    if (getFilteredAlerts(relevantAlerts, isWarningAlert).length > 0) {
      return {
        status: NodeStatus.warning,
        message,
      };
    }
    return {
      status: NodeStatus.info,
      message,
    };
  }
  if (_.isEqual(resourceModel, NodeModel)) {
    return getNodeStatusWithDescriptors(
      resource as any,
      nodeDeploymentMap[getName(resource)],
      t
    );
  }
  if (_.isEqual(resourceModel, DeploymentModel)) {
    const availabilityStatus = (
      resource as DeploymentKind
    )?.status?.conditions?.find(
      (condition) => condition?.type === 'Available'
    )?.status;
    return availabilityStatus === 'True'
      ? { status: NodeStatus.success, message: '' }
      : { status: NodeStatus.danger, message: t('Deployment is unavailable') };
  }
  return getStorageClusterStatus(
    _.flatten(Object.values(nodeDeploymentMap)),
    t
  );
};

export const getStatus = (
  resourceModel: K8sModel,
  nodeDeploymentMap: NodeDeploymentMap,
  resource: K8sResourceCommon,
  alerts: Alert[]
): NodeStatus =>
  getStatusWithDescriptors(
    resourceModel,
    nodeDeploymentMap,
    resource,
    alerts,
    _.identity
  ).status;
