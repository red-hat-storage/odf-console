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
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
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
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Name')}</DescriptionListTerm>
              <DescriptionListDescription>
                {node.metadata.name || '-'}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Role')}</DescriptionListTerm>
              <DescriptionListDescription>
                {roles.join(', ')}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Instance type')}</DescriptionListTerm>
              <DescriptionListDescription>
                {getNodeInstanceType(node)}
              </DescriptionListDescription>
            </DescriptionListGroup>

            {availableZone && (
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Zone')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {availableZone}
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}

            {availableRack && (
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Rack')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {availableRack}
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}

            <DescriptionListGroup>
              <DescriptionListTerm>{t('External ID')}</DescriptionListTerm>
              <DescriptionListDescription>
                {_.get(node, 'spec.externalID', '-')}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Node addresses')}</DescriptionListTerm>
              <DescriptionListDescription>
                <NodeIPList ips={getNodeAddresses(node)} expand />
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Annotations')}</DescriptionListTerm>
              <DescriptionListDescription>
                {t('{{count}} annotation', {
                  count: _.size(node.metadata.annotations),
                })}
              </DescriptionListDescription>
            </DescriptionListGroup>

            {machine.name && (
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Machine')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <ResourceLink
                    kind={referenceForModel(MachineModel)}
                    name={machine.name}
                    namespace={machine.namespace}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}

            {_.has(node, 'spec.unschedulable') && (
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Unschedulable')}</DescriptionListTerm>
                <DescriptionListDescription className="text-capitalize">
                  {_.get(node, 'spec.unschedulable', '-').toString()}
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
          </DescriptionList>
        </div>
        <div className="col-md-6 col-xs-12">
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Status')}</DescriptionListTerm>
              <DescriptionListDescription>
                <Status status={nodeStatus(node)} />
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Operating system')}</DescriptionListTerm>
              <DescriptionListDescription className="text-capitalize">
                {_.get(node, 'status.nodeInfo.operatingSystem', '-')}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Kernel version')}</DescriptionListTerm>
              <DescriptionListDescription>
                {_.get(node, 'status.nodeInfo.kernelVersion', '-')}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('OS image')}</DescriptionListTerm>
              <DescriptionListDescription>
                {_.get(node, 'status.nodeInfo.osImage', '-')}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Architecture')}</DescriptionListTerm>
              <DescriptionListDescription className="text-uppercase">
                {_.get(node, 'status.nodeInfo.architecture', '-')}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Kubelet version')}</DescriptionListTerm>
              <DescriptionListDescription>
                {_.get(node, 'status.nodeInfo.kubeletVersion', '-')}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Provider ID')}</DescriptionListTerm>
              <DescriptionListDescription>
                {getProviderID(node)}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Created')}</DescriptionListTerm>
              <DescriptionListDescription>
                <Timestamp timestamp={node.metadata.creationTimestamp} />
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>
      </div>
    </div>
  );
};
