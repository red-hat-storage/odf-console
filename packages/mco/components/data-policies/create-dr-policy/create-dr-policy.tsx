import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants/common';
import PageHeading from '@odf/shared/heading/page-heading';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import {
  ODFStorageSystem,
  CephClusterModel,
  ClusterServiceVersionModel,
} from '@odf/shared/models';
import {
  K8sResourceKind,
  ClusterServiceVersionKind,
  ListKind,
  StorageSystemKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  referenceForGroupVersionKind,
  referenceForModel,
  getODFCsv,
} from '@odf/shared/utils';
import {
  getAPIVersionForModel,
  k8sCreate,
  k8sPatch,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';
import { RouteComponentProps, match as Match } from 'react-router';
import {
  Form,
  FormGroup,
  Text,
  TextInput,
  Badge,
  TextContent,
  TextVariants,
  InputGroup,
  ActionGroup,
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import {
  MAX_ALLOWED_CLUSTERS,
  REPLICATION_TYPE,
  STORAGE_SYSTEM_NAME,
  ODF_MINIMUM_SUPPORT,
  CEPH_CLUSTER_NAME,
} from '../../../constants/dr-policy';
import { DRPolicyModel, MirrorPeerModel } from '../../../models';
import { DRPolicyKind, MirrorPeerKind } from '../../../types';
import { isMinimumSupportedODFVersion } from '../../../utils/disaster-recovery';
import {
  Cluster,
  SelectClusterList,
  ManagedClusterMapping,
} from './select-cluster-list';
import './create-dr-policy.scss';

const fetchMirrorPeer = (
  mirrorPeers: MirrorPeerKind[],
  peerNames: string[]
): MirrorPeerKind =>
  mirrorPeers?.find((mirrorPeer) => {
    const existingPeerNames =
      mirrorPeer?.spec?.items?.map((item) => item?.clusterName) ?? [];
    return existingPeerNames.sort().join(',') === peerNames.sort().join(',');
  });

type SelectedClusterProps = {
  id: number;
  cluster: Cluster;
  setSelectedClusters: React.Dispatch<
    React.SetStateAction<ManagedClusterMapping>
  >;
};

const SelectedCluster: React.FC<SelectedClusterProps> = ({
  id,
  cluster,
  setSelectedClusters,
}) => {
  const {
    name: clusterName,
    region,
    storageSystem,
    odfVersion,
  } = cluster ?? {};
  const [ss, ssLoaded, ssLoadError] = useK8sGet<StorageSystemKind>(
    ODFStorageSystem,
    STORAGE_SYSTEM_NAME,
    CEPH_STORAGE_NAMESPACE,
    clusterName
  );
  const [cephCluster, cephClusterLoaded, cephClusterLoadError] =
    useK8sGet<K8sResourceKind>(
      CephClusterModel,
      CEPH_CLUSTER_NAME,
      CEPH_STORAGE_NAMESPACE,
      clusterName
    );

  const [csvList, csvListLoaded, csvListLoadError] = useK8sGet<
    ListKind<ClusterServiceVersionKind>
  >(ClusterServiceVersionModel, null, CEPH_STORAGE_NAMESPACE, clusterName);

  React.useEffect(() => {
    if (
      ssLoaded &&
      cephClusterLoaded &&
      csvListLoaded &&
      !(ssLoadError && cephClusterLoadError && csvListLoadError)
    ) {
      const operator = getODFCsv(csvList?.items);
      setSelectedClusters((selectedClusters) => ({
        ...selectedClusters,
        [clusterName]: {
          name: clusterName,
          region: region,
          storageClusterId: cephCluster?.status?.ceph?.fsid ?? '',
          storageSystem: ss?.metadata?.name ?? '',
          odfVersion: operator?.spec?.version ?? '',
          isValidODFVersion: isMinimumSupportedODFVersion(odfVersion),
          storageSystemLoaded: true,
          storageClusterIdLoaded: true,
          csvLoaded: true,
        },
      }));
    }
  }, [
    ssLoaded,
    cephClusterLoaded,
    csvListLoaded,
    ssLoadError,
    cephClusterLoadError,
    csvListLoadError,
    ss,
    cephCluster,
    csvList,
    clusterName,
    region,
    odfVersion,
    setSelectedClusters,
  ]);

  return (
    <Flex
      display={{ default: 'inlineFlex' }}
      className="mco-create-data-policy__flex"
    >
      <FlexItem>
        <Badge key={id} isRead>
          {id}
        </Badge>
      </FlexItem>
      <FlexItem>
        <TextContent>
          <Text component={TextVariants.p}>{clusterName}</Text>
          <Text component={TextVariants.small}>{region}</Text>
          <Text component={TextVariants.small}>{storageSystem}</Text>
        </TextContent>
      </FlexItem>
    </Flex>
  );
};

const SyncSchedule: React.FC<SyncScheduleProps> = ({
  schedule,
  setSchedule,
}) => {
  const { t } = useCustomTranslation();

  const SyncSchedule = {
    minutes: t('minutes'),
    hours: t('hours'),
    days: t('days'),
  };
  const SCHEDULE_FORMAT = {
    [SyncSchedule.minutes]: 'm',
    [SyncSchedule.hours]: 'h',
    [SyncSchedule.days]: 'd',
  };

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedFormat, setSelectedFormat] = React.useState(
    SyncSchedule.minutes
  );

  const setSyncSchedule = (time: string, format?: string) =>
    setSchedule(`${time}${SCHEDULE_FORMAT[format ?? selectedFormat]}`);

  const onSelect = (event) => {
    const scheduleTime = schedule.match(/\d+/g)[0];
    const newScheduleFormat = event.target.value;
    setIsOpen(false);
    setSelectedFormat(newScheduleFormat);
    setSyncSchedule(scheduleTime, newScheduleFormat);
  };

  return (
    <InputGroup>
      <TextInput
        id="sync-schedule"
        defaultValue="5"
        type="number"
        onChange={(scheduleTime) => setSyncSchedule(scheduleTime)}
        isRequired
      />
      <Dropdown
        aria-label={t('Select schedule time format in minutes, hours or days')}
        onSelect={onSelect}
        toggle={
          <DropdownToggle onToggle={(open) => setIsOpen(open)}>
            {selectedFormat}
          </DropdownToggle>
        }
        isOpen={isOpen}
        dropdownItems={[
          <DropdownItem
            key="minutes"
            value={SyncSchedule.minutes}
            component="button"
          >
            {SyncSchedule.minutes}
          </DropdownItem>,
          <DropdownItem
            key="hours"
            value={SyncSchedule.hours}
            component="button"
          >
            {SyncSchedule.hours}
          </DropdownItem>,
          <DropdownItem key="days" value={SyncSchedule.days} component="button">
            {SyncSchedule.days}
          </DropdownItem>,
        ]}
      />
    </InputGroup>
  );
};

type SyncScheduleProps = {
  schedule: string;
  setSchedule: React.Dispatch<React.SetStateAction<string>>;
};

type ReRouteResourceProps = {
  history: RouteComponentProps['history'];
  match: Match<{ url: string }>;
};

export const CreateDRPolicy: React.FC<ReRouteResourceProps> = ({
  match,
  history,
}) => {
  const { t } = useCustomTranslation();
  const { url } = match;

  const [policyName, setPolicyName] = React.useState('');
  const [replication, setReplication] = React.useState('');
  const [syncTime, setSyncTime] = React.useState('5m');
  const [isODFDetected, setODFDetected] = React.useState(false);
  const [selectedClusters, setSelectedClusters] =
    React.useState<ManagedClusterMapping>({});
  const [isReplicationOpen, setReplicationOpen] = React.useState(false);
  const [isReplicationInputManual, setIsReplicationInputManual] =
    React.useState(false);
  const [errorMessage, setError] = React.useState('');
  const [mirrorPeers] = useK8sWatchResource<MirrorPeerKind[]>({
    kind: referenceForModel(MirrorPeerModel),
    isList: true,
    namespaced: false,
  });

  const clustersData = React.useMemo(
    () => Object.values(selectedClusters),
    [selectedClusters]
  );

  React.useEffect(() => {
    if (clustersData.length === 2) {
      // ODF detection
      setODFDetected(
        clustersData.every(
          (cluster) =>
            cluster?.storageSystem !== '' && cluster?.isValidODFVersion
        )
      );
      // DR replication type
      const isReplicationAutoDetectable = clustersData?.every(
        (cluster) => cluster?.storageClusterId !== ''
      );
      const storageClusterIDs = clustersData?.reduce((ids, cluster) => {
        if (cluster?.storageClusterId !== '') {
          ids.add(cluster?.storageClusterId);
        }
        return ids;
      }, new Set());
      setIsReplicationInputManual(!isReplicationAutoDetectable);
      setReplication(
        isReplicationAutoDetectable && storageClusterIDs.size <= 1
          ? REPLICATION_TYPE(t)['sync']
          : REPLICATION_TYPE(t)['async']
      );
    } else {
      setODFDetected(false);
      setReplication('');
      setIsReplicationInputManual(false);
    }
  }, [clustersData, t, isReplicationInputManual]);

  const replicationDropdownItems = Object.values(REPLICATION_TYPE(t)).map(
    (replType) => (
      <DropdownItem
        isDisabled={!isReplicationInputManual}
        key={replType}
        component="button"
        id={replType}
        data-test-id="replication-dropdown-item"
        onClick={() => setReplication(replType)}
      >
        {replType}
      </DropdownItem>
    )
  );

  const onCreate = () => {
    const peerNames = clustersData?.map((cluster) => cluster?.name) ?? [];
    const mirrorPeer: MirrorPeerKind =
      fetchMirrorPeer(mirrorPeers, peerNames) ?? {};
    const promises: Promise<K8sResourceKind>[] = [];

    if (Object.keys(mirrorPeer).length > 0) {
      // MirrorPeer update
      if (replication === REPLICATION_TYPE(t).async) {
        const patch = [
          {
            op: 'replace',
            path: '/spec/schedulingIntervals',
            value: [
              ...new Set([...mirrorPeer?.spec?.schedulingIntervals, syncTime]),
            ],
          },
        ];
        promises.push(
          k8sPatch({
            model: MirrorPeerModel,
            resource: mirrorPeer,
            data: patch,
          })
        );
      }
    } else {
      // MirrorPeer creation
      const payload: MirrorPeerKind = {
        apiVersion: getAPIVersionForModel(MirrorPeerModel),
        kind: MirrorPeerModel.kind,
        metadata: { generateName: 'mirror-peer-' },
        spec: {
          manageS3: true,
          type: replication === REPLICATION_TYPE(t)['async'] ? 'async' : 'sync',
          schedulingIntervals:
            replication === REPLICATION_TYPE(t)['async'] ? [syncTime] : [],
          items: clustersData?.map((cluster) => ({
            clusterName: cluster?.name,
            storageClusterRef: {
              name: cluster.storageSystem,
              namespace: CEPH_STORAGE_NAMESPACE,
            },
          })),
        },
      };
      promises.push(k8sCreate({ model: MirrorPeerModel, data: payload }));
    }

    // DRPolicy creation
    const payload: DRPolicyKind = {
      apiVersion: getAPIVersionForModel(DRPolicyModel),
      kind: DRPolicyModel.kind,
      metadata: { name: policyName },
      spec: {
        schedulingInterval:
          replication === REPLICATION_TYPE(t)['async'] ? syncTime : '0m',
        drClusters: peerNames,
      },
    };
    promises.push(k8sCreate({ model: DRPolicyModel, data: payload }));
    Promise.all(promises)
      .then(() => {
        const { apiGroup, apiVersion, kind } = DRPolicyModel;
        const drPolicyKind =
          referenceForGroupVersionKind(apiGroup)(apiVersion)(kind);
        history.push(url.replace(`${drPolicyKind}/~new`, ''));
      })
      .catch((error) => setError(error?.message));
  };

  return (
    <div>
      <PageHeading title={t('Create DRPolicy')}>
        <TextContent className="mco-create-data-policy__description">
          <Text component={TextVariants.small}>
            {t(
              'Get a quick recovery in a remote or secondary cluster with a disaster recovery (DR) policy'
            )}
          </Text>
        </TextContent>
      </PageHeading>
      <Form className="mco-create-data-policy">
        <FormGroup fieldId="policy-name" label={t('Policy name')}>
          <TextInput
            id="policy-name"
            value={policyName}
            type="text"
            onChange={setPolicyName}
            isRequired
          />
        </FormGroup>
        <FormGroup
          fieldId="connect-clusters"
          label={t('Connect clusters')}
          helperText={t(
            'Enables mirroring/replication between the two selected clusters and ensures failover from primary cluster to secondary cluster in the event of an outage.'
          )}
          isHelperTextBeforeField
        >
          <SelectClusterList
            selectedClusters={selectedClusters}
            setSelectedClusters={setSelectedClusters}
          />
        </FormGroup>
        <FormGroup fieldId="policy-name">
          <Alert
            className="co-alert mco-create-data-policy__alert"
            title={t(
              'Data Foundation 4.11 or above must be installed on the managed clusters to setup connection for enabling replication/mirroring'
            )}
            variant={AlertVariant.info}
            isInline
          ></Alert>
        </FormGroup>
        {!!clustersData.length && (
          <FormGroup fieldId="selected-clusters" label={t('Selected clusters')}>
            {clustersData?.map((c, i) => (
              <SelectedCluster
                key={c.name}
                id={i + 1}
                cluster={c}
                setSelectedClusters={setSelectedClusters}
              />
            ))}
          </FormGroup>
        )}
        {isODFDetected ? (
          <>
            {replication && (
              <FormGroup
                fieldId="replication-policy"
                label={t('Replication policy')}
              >
                <Dropdown
                  className="mco-create-data-policy__dropdown"
                  onSelect={() => setReplicationOpen(false)}
                  toggle={
                    <DropdownToggle
                      isDisabled={!isReplicationInputManual}
                      className="mco-create-data-policy__dropdown"
                      id="toggle-id"
                      onToggle={() => setReplicationOpen(!isReplicationOpen)}
                      toggleIndicator={CaretDownIcon}
                    >
                      {replication}
                    </DropdownToggle>
                  }
                  isOpen={isReplicationOpen}
                  dropdownItems={replicationDropdownItems}
                />
              </FormGroup>
            )}
            {replication === REPLICATION_TYPE(t)['async'] && (
              <FormGroup fieldId="sync-schedule" label={t('Sync schedule')}>
                <SyncSchedule schedule={syncTime} setSchedule={setSyncTime} />
              </FormGroup>
            )}
          </>
        ) : (
          clustersData?.map((c) =>
            c.csvLoaded && !c?.isValidODFVersion ? (
              <Alert
                className="co-alert mco-create-data-policy__alert"
                title={t(
                  '{{ name }} has invalid ODF version, update to ODF {{ version }} or latest version to enable DR protection',
                  { name: c?.name, version: ODF_MINIMUM_SUPPORT }
                )}
                variant={AlertVariant.danger}
                isInline
              />
            ) : (
              c?.storageSystem === '' &&
              c.storageSystemLoaded && (
                <Alert
                  className="co-alert mco-create-data-policy__alert"
                  title={t('{{ name }} is not connected to RHCS', {
                    name: c?.name,
                  })}
                  variant={AlertVariant.danger}
                  isInline
                />
              )
            )
          )
        )}
        {errorMessage && (
          <FormGroup fieldId="error-message">
            <Alert
              className="co-alert mco-create-data-policy__alert"
              title={t('An error occurred')}
              variant="danger"
              isInline
            >
              {errorMessage}
            </Alert>
          </FormGroup>
        )}
        <ActionGroup className="mco-create-data-policy__action-group">
          <Button
            variant={ButtonVariant.primary}
            onClick={onCreate}
            isDisabled={
              !policyName ||
              Object.keys(selectedClusters)?.length !== MAX_ALLOWED_CLUSTERS ||
              !isODFDetected
            }
          >
            {t('Create')}
          </Button>
          <Button variant={ButtonVariant.secondary} onClick={history.goBack}>
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </Form>
    </div>
  );
};
