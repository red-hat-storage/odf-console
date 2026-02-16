import * as React from 'react';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { PodModel } from '@odf/shared/models';
import { PodWithMetricsKind } from '@odf/shared/topology/sidebar/common/PodList';
import { NodeKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Title,
} from '@patternfly/react-core';
import '@odf/shared/topology/sidebar/common/resources-tab.scss';
import { getOsdInformation } from '../../utils/osd';
import { OsdInformation } from '../types';

type NodeResourcesProps = {
  resource: NodeKind;
  odfNamespace: string;
};

export const OSDDetails: React.FC<NodeResourcesProps> = ({
  resource: node,
  odfNamespace,
}) => {
  const { t } = useCustomTranslation();
  const [pods, loaded, loadError] = useK8sWatchResource<PodWithMetricsKind[]>({
    kind: PodModel.kind,
    isList: true,
    namespaced: true,
    namespace: odfNamespace,
  });

  const [osdInformation, loading, osdLoadError] = useCustomPrometheusPoll({
    query: 'ceph_osd_metadata',
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const osdInformationData = React.useMemo(() => {
    if (loading || loadError || !loaded) return [];
    return getOsdInformation(pods, node, osdInformation?.data?.result);
  }, [loading, loadError, loaded, pods, node, osdInformation]);

  return (
    <div className="odf-m-pane__body topology-sidebar-tab__resources">
      {loaded && !loading && !loadError && !osdLoadError ? (
        osdInformationData?.length > 0 ? (
          osdInformationData.map((osd: OsdInformation) => (
            <OSDDetailsComponent key={osd.podName} {...osd} />
          ))
        ) : (
          <div className="odf-topology-sidebar__empty-state">
            {t('No OSD information available')}
          </div>
        )
      ) : (
        <DataUnavailableError />
      )}
    </div>
  );
};

type OSDDetailsProps = OsdInformation;

const OSDDetailsComponent: React.FC<OSDDetailsProps> = ({
  deviceClass,
  osdIP,
  osdID,
  nodeIP,
  podName,
}) => {
  const { t } = useCustomTranslation();
  return (
    <div>
      <Title headingLevel="h3">{t('OSD {{osdID}} details', { osdID })}</Title>
      <DescriptionList>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Device class')}</DescriptionListTerm>
          <DescriptionListDescription>{deviceClass}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('OSD IP')}</DescriptionListTerm>
          <DescriptionListDescription>{osdIP}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Node IP')}</DescriptionListTerm>
          <DescriptionListDescription>{nodeIP}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Pod name')}</DescriptionListTerm>
          <DescriptionListDescription>{podName}</DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </div>
  );
};
