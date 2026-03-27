import * as React from 'react';
import { ACMManagedClusterModel } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Title,
} from '@patternfly/react-core';

type TopologySideBarProps = {
  resource: K8sResourceCommon;
  onClose: () => void;
  isExpanded: boolean;
};

const TopologySideBar: React.FC<TopologySideBarProps> = ({
  resource,
  onClose,
  isExpanded,
}) => {
  const { t } = useCustomTranslation();

  if (!isExpanded || !resource) {
    return null;
  }

  const resourceName = getName(resource);
  const resourceKind = resource?.kind;

  return (
    <DrawerPanelContent isResizable minSize="400px">
      <DrawerHead>
        <Title headingLevel="h2" size="xl">
          {resourceKind === ACMManagedClusterModel.kind
            ? t('Cluster details')
            : t('Details')}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <div className="mco-topology-sidebar">
          <div className="mco-topology-sidebar__section">
            <Title headingLevel="h3" size="md">
              {t('Name')}
            </Title>
            <p>{resourceName}</p>
          </div>
          {resourceKind && (
            <div className="mco-topology-sidebar__section">
              <Title headingLevel="h3" size="md">
                {t('Kind')}
              </Title>
              <p>{resourceKind}</p>
            </div>
          )}
        </div>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default TopologySideBar;
