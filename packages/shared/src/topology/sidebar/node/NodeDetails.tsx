import * as React from 'react';
import { Timestamp } from '@odf/shared/details-page/timestamp';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { MachineModel } from '@odf/shared/models';
import { nodeStatus } from '@odf/shared/status/Node';
import { Status } from '@odf/shared/status/Status';
import { NodeKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getProviderID,
  getNodeAddresses,
  getNodeRoles,
  getNodeZone,
  getNodeMachineNameAndNamespace,
  getNodeInstanceType,
  referenceForModel,
  getRack,
} from '@odf/shared/utils';
import { ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import NodeIPList from './NodeIPList';

export type NodeDetailsProps = {
  resource: NodeKind;
};

export const NodeDetails: React.FC<NodeDetailsProps> = ({ resource: node }) => {
  const machine = getNodeMachineNameAndNamespace(node);
  const roles = getNodeRoles(node).sort();
  const { t } = useCustomTranslation();
  const availableZone = getNodeZone(node);
  const availableRack = getRack(node);

  return (
    <div className="odf-m-pane__body">
      <SectionHeading text={t('Node details')} />
      <div className="row">
        <div className="col-md-6 col-xs-12">
          <dl>
            <dt>{t('Name')}</dt>
            <dd>{node.metadata.name || '-'}</dd>
            <dt>{t('Role')}</dt>
            <dd>{roles.join(', ')}</dd>
            <dt>{t('Instance type')}</dt>
            <dd>{getNodeInstanceType(node)}</dd>
            {availableZone && (
              <>
                <dt>{t('Zone')}</dt>
                <dd>{availableZone}</dd>
              </>
            )}
            {availableRack && (
              <>
                <dt>{t('Rack')}</dt>
                <dd>{availableRack}</dd>
              </>
            )}
            <dt>{t('External ID')}</dt>
            <dd>{_.get(node, 'spec.externalID', '-')}</dd>
            <dt>{t('Node addresses')}</dt>
            <dd>
              <NodeIPList ips={getNodeAddresses(node)} expand />
            </dd>
            <dt>{t('Annotations')}</dt>
            <dd>
              {t('{{count}} annotation', {
                count: _.size(node.metadata.annotations),
              })}
            </dd>
            {machine.name && (
              <>
                <dt>{t('Machine')}</dt>
                <dd>
                  <ResourceLink
                    kind={referenceForModel(MachineModel)}
                    name={machine.name}
                    namespace={machine.namespace}
                  />
                </dd>
              </>
            )}
            {_.has(node, 'spec.unschedulable') && (
              <>
                <dt>{t('Unschedulable')}</dt>
                <dd className="text-capitalize">
                  {_.get(node, 'spec.unschedulable', '-').toString()}
                </dd>
              </>
            )}
          </dl>
        </div>
        <div className="col-md-6 col-xs-12">
          <dl>
            <dt>{t('Status')}</dt>
            <dd>
              <Status status={nodeStatus(node)} />
            </dd>
            <dt>{t('Operating system')}</dt>
            <dd className="text-capitalize">
              {_.get(node, 'status.nodeInfo.operatingSystem', '-')}
            </dd>
            <dt>{t('Kernel version')}</dt>
            <dd>{_.get(node, 'status.nodeInfo.kernelVersion', '-')}</dd>
            <dt>{t('OS image')}</dt>
            <dd>{_.get(node, 'status.nodeInfo.osImage', '-')}</dd>
            <dt>{t('Architecture')}</dt>
            <dd className="text-uppercase">
              {_.get(node, 'status.nodeInfo.architecture', '-')}
            </dd>
            <dt>{t('Kubelet version')}</dt>
            <dd>{_.get(node, 'status.nodeInfo.kubeletVersion', '-')}</dd>
            <dt>{t('Provider ID')}</dt>
            <dd>{getProviderID(node)}</dd>
            <dt>{t('Created')}</dt>
            <dd>
              <Timestamp timestamp={node.metadata.creationTimestamp} />
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
};
