import * as React from 'react';
import { FDF_FLAG } from '@odf/core/redux';
import { RemoteClusterKind } from '@odf/core/types/scale';
import { isClusterIgnored, isExternalCluster } from '@odf/core/utils/odf';
import { DASH } from '@odf/shared/constants';
import { useWatchStorageClusters } from '@odf/shared/hooks/useWatchStorageClusters';
import { resourceStatus } from '@odf/shared/status/Resource';
import { Status } from '@odf/shared/status/Status';
import { StorageClusterPhase } from '@odf/shared/types/storage';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  K8sResourceKind,
  StatusIconAndText,
  useFlag,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Button,
  ButtonVariant,
  Card,
  CardBody,
  CardHeader,
  CardProps,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';
import './ExternalSystemsCard.scss';

const getClustersStatuses = (
  clusters: K8sResourceKind[] = [],
  t: TFunction
): React.ReactNode => {
  let [healthy, error, warning] = [0, 0, 0];
  for (const cluster of clusters) {
    const clusterStatus = resourceStatus(cluster);
    if (clusterStatus === StorageClusterPhase.Ready) {
      healthy++;
    } else if (clusterStatus === StorageClusterPhase.Error) {
      error++;
    } else {
      // We group all other statuses as warning.
      warning++;
    }
  }

  return (
    <>
      {error > 0 && (
        <Status
          status={StorageClusterPhase.Error}
          title={String(error)}
          className="pf-v6-u-mr-lg"
        />
      )}
      {warning > 0 && (
        <StatusIconAndText
          icon={<YellowExclamationTriangleIcon />}
          title={String(warning)}
          className="pf-v6-u-mr-lg"
        />
      )}
      {healthy > 0 && (
        <Status status={StorageClusterPhase.Ready} title={String(healthy)} />
      )}
      {healthy + error + warning === 0 && (
        <span className="pf-v6-u-disabled-color-100">
          {t('No external systems connected')}
        </span>
      )}
    </>
  );
};

const getScaleClustersStatuses = (
  clusters: RemoteClusterKind[] = [],
  t: TFunction
): React.ReactNode => {
  let [healthy, error, warning] = [0, 0, 0];
  for (const cluster of clusters) {
    const clusterStatus = cluster.status?.conditions?.find(
      (condition) => condition.type === 'Available'
    )?.status;
    if (clusterStatus === 'True') {
      healthy++;
    }
    if (clusterStatus === 'False') {
      error++;
    }
    if (clusterStatus === 'Unknown') {
      warning++;
    }
  }
  return (
    <>
      {error > 0 && (
        <Status
          status={StorageClusterPhase.Error}
          title={String(error)}
          className="pf-v6-u-mr-lg"
        />
      )}
      {warning > 0 && (
        <StatusIconAndText
          icon={<YellowExclamationTriangleIcon />}
          title={String(warning)}
          className="pf-v6-u-mr-lg"
        />
      )}
      {healthy > 0 && (
        <Status status={StorageClusterPhase.Ready} title={String(healthy)} />
      )}
      {healthy + error + warning === 0 && (
        <span className="pf-v6-u-disabled-color-100">
          {t('No external systems connected')}
        </span>
      )}
    </>
  );
};
export const ExternalSystemsCard: React.FC<CardProps> = ({ className }) => {
  const { t } = useCustomTranslation();
  const { storageClusters, flashSystemClusters, remoteClusters } =
    useWatchStorageClusters();
  const navigate = useNavigate();

  const isFDF = useFlag(FDF_FLAG);

  const cephClustersStatuses =
    storageClusters?.loaded && !storageClusters?.loadError
      ? getClustersStatuses(
          storageClusters?.data?.filter(
            (cluster) =>
              !isClusterIgnored(cluster) && isExternalCluster(cluster)
          ),
          t
        )
      : DASH;
  const fsClustersStatuses =
    flashSystemClusters?.loaded && !flashSystemClusters?.loadError
      ? getClustersStatuses(flashSystemClusters?.data, t)
      : DASH;
  const scaleClustersStatuses =
    (isFDF ? remoteClusters?.loaded : true) && !remoteClusters?.loadError
      ? getScaleClustersStatuses(remoteClusters?.data, t)
      : DASH;

  return (
    <Card className={classNames(className, 'odf-external-system-card')}>
      <CardHeader>
        <CardTitle>{t('External systems')}</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack>
          <StackItem>
            <DescriptionList>
              {isFDF && (
                <DescriptionListGroup>
                  <DescriptionListTerm>
                    {t('IBM Scale System')}
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    {scaleClustersStatuses}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
              <DescriptionListGroup>
                <DescriptionListTerm>
                  {t('IBM Flash System')}
                </DescriptionListTerm>
                <DescriptionListDescription>
                  {fsClustersStatuses}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Red Hat Ceph')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {cephClustersStatuses}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </StackItem>
          <StackItem isFilled></StackItem>
          <StackItem>
            <Button
              variant={ButtonVariant.link}
              icon={<ArrowRightIcon />}
              iconPosition="end"
              className="pf-v6-u-font-size-lg odf-cluster-card__storage-link"
              onClick={() => navigate('/odf/external-systems')}
            >
              {t('View external systems')}
            </Button>
          </StackItem>
        </Stack>
      </CardBody>
    </Card>
  );
};
