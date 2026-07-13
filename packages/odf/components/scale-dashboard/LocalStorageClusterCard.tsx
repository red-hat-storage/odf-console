import * as React from 'react';
import {
  IBM_SCALE_LOCAL_CLUSTER_NAME,
  IBM_SCALE_NAMESPACE,
  SCALE_DAEMON_NODE_LABEL,
} from '@odf/core/constants';
import { ClusterKind, EncryptionConfigKind } from '@odf/core/types/scale';
import { getName, useCustomTranslation } from '@odf/shared';
import { NodeModel } from '@odf/shared/models';
import { ClusterModel, EncryptionConfigModel } from '@odf/shared/models/scale';
import { useModalWrapper } from '@odf/shared/sdk-wrapper/useModalWrapper';
import { NodeKind } from '@odf/shared/types';
import {
  isNotFoundError,
  referenceForModel,
  resourcePathFromModel,
} from '@odf/shared/utils';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { ResourceInventoryItem } from '@openshift-console/dynamic-plugin-sdk-internal';
import { useParams } from 'react-router-dom-v5-compat';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Skeleton,
  Button,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import AddLocalScaleNodesModal from './AddLocalScaleNodesModal';
import EncryptionConfigModal from './EncryptionConfigModal';

const nodesHref = `${resourcePathFromModel(NodeModel)}?label=${encodeURIComponent(
  `${SCALE_DAEMON_NODE_LABEL}=`
)}`;

const LocalStorageClusterCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { systemName } = useParams<{ systemName: string }>();
  const launchModal = useModalWrapper();

  const watchResources = React.useMemo(
    () => ({
      cluster: {
        kind: referenceForModel(ClusterModel),
        namespace: IBM_SCALE_NAMESPACE,
        name: IBM_SCALE_LOCAL_CLUSTER_NAME,
        isList: false,
      },
      nodes: {
        kind: NodeModel.kind,
        isList: true,
        selector: {
          matchExpressions: [
            { key: SCALE_DAEMON_NODE_LABEL, operator: 'Exists' as const },
          ],
        },
      },
      encryptionConfig: {
        kind: referenceForModel(EncryptionConfigModel),
        namespace: IBM_SCALE_NAMESPACE,
        name: `${systemName}-encryption-config`,
        isList: false,
      },
    }),
    [systemName]
  );

  const resources = useK8sWatchResources<{
    cluster: ClusterKind;
    nodes: NodeKind[];
    encryptionConfig: EncryptionConfigKind;
  }>(watchResources);

  const cluster = resources.cluster?.data as ClusterKind;
  const clusterLoaded = resources.cluster?.loaded;
  const clusterLoadError = resources.cluster?.loadError;

  const nodes = (resources.nodes?.data ?? []) as NodeKind[];
  const nodesLoaded = resources.nodes?.loaded;
  const nodesLoadError = resources.nodes?.loadError;

  const encryptionConfig = resources.encryptionConfig
    ?.data as EncryptionConfigKind;
  const encryptionConfigLoaded = resources.encryptionConfig?.loaded;
  const encryptionConfigLoadError = resources.encryptionConfig?.loadError;

  const clusterName = getName(cluster);
  const isEncrypted = !!getName(encryptionConfig);
  const encryptionConfigNotFound = isNotFoundError(encryptionConfigLoadError);

  const openNodeExpansion = React.useCallback(
    () => launchModal(AddLocalScaleNodesModal, { systemName }),
    [launchModal, systemName]
  );
  const openEncryptionConfig = React.useCallback(
    () => launchModal(EncryptionConfigModal, { systemName, encryptionConfig }),
    [encryptionConfig, launchModal, systemName]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Local StorageCluster')}</CardTitle>
      </CardHeader>
      <CardBody>
        <DescriptionList>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Name')}</DescriptionListTerm>
            <DescriptionListDescription>
              {clusterLoadError ? (
                t('N/A')
              ) : !clusterLoaded ? (
                <Skeleton width="35%" />
              ) : (
                clusterName || t('N/A')
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
        <Flex alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <ResourceInventoryItem
              dataTest="inventory-nodes"
              isLoading={!nodesLoaded}
              error={!!nodesLoadError}
              kind={NodeModel as any}
              resources={nodes}
              basePath={nodesHref}
            />
          </FlexItem>
          <FlexItem>
            <Button
              variant="plain"
              aria-label={t('Edit node inventory')}
              onClick={openNodeExpansion}
              icon={<PencilAltIcon />}
            />
          </FlexItem>
        </Flex>
        <DescriptionList className="pf-v6-u-mt-md">
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Encryption')}</DescriptionListTerm>
            <DescriptionListDescription>
              <Flex alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  {encryptionConfigLoadError && !encryptionConfigNotFound ? (
                    t('N/A')
                  ) : !encryptionConfigLoaded && !encryptionConfigNotFound ? (
                    <Skeleton width="35%" />
                  ) : isEncrypted ? (
                    t('Enabled')
                  ) : (
                    t('Disabled')
                  )}
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="plain"
                    aria-label={t('Edit encryption')}
                    onClick={openEncryptionConfig}
                    icon={<PencilAltIcon />}
                    isDisabled={
                      !encryptionConfigLoaded && !encryptionConfigNotFound
                    }
                  />
                </FlexItem>
              </Flex>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </CardBody>
    </Card>
  );
};

export default LocalStorageClusterCard;
