import * as React from 'react';
import { PodModel } from '@odf/shared/models';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { getUID } from '@odf/shared/selectors';
import { resourceStatus } from '@odf/shared/status/Resource';
import { Status } from '@odf/shared/status/Status';
import { PodKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  formatBytesAsMiB,
  formatCores,
  resourcePathFromModel,
} from '@odf/shared/utils';
import { ResourceStatus } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

type PodOverviewItemProps = {
  pod: PodWithMetricsKind;
};

const PodOverviewItem: React.FC<PodOverviewItemProps> = ({ pod }) => {
  const { t } = useCustomTranslation();
  const {
    metadata: { name, namespace },
    metrics: { cpu, memory },
  } = pod;
  const formattedCores = isNaN(cpu) ? 'N/A' : `${formatCores(cpu)} cores`;
  const formattedMemory = isNaN(memory)
    ? 'N/A'
    : `${formatBytesAsMiB(memory)} MiB`;

  return (
    <li className="list-group-item container-fluid">
      <div className="row">
        <span className="col-xs-5">
          <ResourceLink
            link={resourcePathFromModel(PodModel, name, namespace)}
            resourceModel={PodModel}
            resourceName={name}
          />
        </span>
        <span className="col-xs-3">
          <ResourceStatus additionalClassNames="hidden-xs">
            <Status status={resourceStatus(pod)} />
          </ResourceStatus>
        </span>
        <span className="col-xs-2">
          <span className="odf-sidebar-pod-list__item-header">
            {t('Memory')}
          </span>
          <span className="odf-sidebar-pod-list__item-content">
            {formattedMemory}
          </span>
        </span>
        <span className="col-xs-2">
          <span className="odf-sidebar-pod-list__item-header">{t('CPU')}</span>
          <span className="odf-sidebar-pod-list__item-content">
            {formattedCores}
          </span>
        </span>
      </div>
    </li>
  );
};

type PodOverviewListProps = {
  pods: PodWithMetricsKind[];
};

export const PodsOverviewList: React.FC<PodOverviewListProps> = ({ pods }) => (
  <ul className="list-group">
    {_.map(pods, (pod) => (
      <PodOverviewItem key={getUID(pod)} pod={pod} />
    ))}
  </ul>
);

export type PodWithMetricsKind = PodKind & {
  metrics: {
    cpu: number;
    memory: number;
  };
};
