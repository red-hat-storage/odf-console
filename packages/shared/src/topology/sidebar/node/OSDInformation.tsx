import * as React from 'react';
import { LoadingBox } from '@odf/shared/generic';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import { NodeKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Title,
} from '@patternfly/react-core';
import '@odf/shared/topology/sidebar/common/resources-tab.scss';
import { TopologyDataContext } from '../../Context';
import { getOsdInformation } from '../../utils/osd';
import { OsdInformation } from '../types';

type NodeResourcesProps = {
  resource: NodeKind;
};

export const OSDDetails: React.FC<NodeResourcesProps> = ({
  resource: node,
}) => {
  const { t } = useCustomTranslation();
  const { podsLoaded, podsLoadError, osdPods } =
    React.useContext(TopologyDataContext);

  const osdInformationData = React.useMemo(() => {
    if (podsLoadError || !podsLoaded) return [];
    return getOsdInformation(osdPods, node);
  }, [podsLoadError, podsLoaded, osdPods, node]);

  const isLoading = !podsLoaded;
  const hasLoadError = !!podsLoadError;

  return (
    <div className="odf-m-pane__body topology-sidebar-tab__resources">
      {hasLoadError ? (
        <DataUnavailableError />
      ) : isLoading ? (
        <LoadingBox className="odf-loading-box loading-box__loading" />
      ) : osdInformationData?.length > 0 ? (
        osdInformationData.map((osd: OsdInformation) => (
          <OSDDetailsComponent key={osd.podName} {...osd} />
        ))
      ) : (
        <div className="odf-topology-sidebar__empty-state">
          {t('No OSD information available')}
        </div>
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
