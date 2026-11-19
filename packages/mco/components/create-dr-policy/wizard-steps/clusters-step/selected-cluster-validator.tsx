import * as React from 'react';
import { ReplicationType } from '@odf/mco/constants';
import { getDRPolicyResourceObj } from '@odf/mco/hooks/mco-resources';
import {
  DRPolicyKind,
  ManagedClusterInfoType,
  MirrorPeerKind,
} from '@odf/mco/types';
import { getReplicationType } from '@odf/mco/utils/disaster-recovery';
import { getName, StatusBox } from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  StatusIconAndText,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Alert, AlertVariant, Spinner } from '@patternfly/react-core';
import { DRPolicyAction, DRPolicyActionType } from '../../utils/reducer';
import '../../create-dr-policy.scss';
import '../../../../style.scss';

const checkSyncPolicyExists = (
  clusters: string[],
  drPolicies: DRPolicyKind[]
): boolean =>
  drPolicies.some((drPolicy) => {
    const { drClusters } = drPolicy.spec;
    const isSyncPolicy = getReplicationType(drPolicy) === ReplicationType.SYNC;
    return (
      isSyncPolicy && drClusters.every((cluster) => clusters.includes(cluster))
    );
  });

const verifyMirrorPeerExistence = (
  clusters: ManagedClusterInfoType[],
  mirrorPeers: MirrorPeerKind[]
): boolean => {
  const peerNames: string[] = clusters.map(getName);
  const mirrorPeer: MirrorPeerKind = mirrorPeers.find((mirrorPeer) =>
    mirrorPeer.spec?.items?.some((item) => peerNames.includes(item.clusterName))
  );
  const existingPeerNames =
    mirrorPeer?.spec?.items?.map((item) => item.clusterName) ?? [];
  // When one of the chosen clusters is already paired with another cluster, return True.
  return existingPeerNames.length > 0
    ? existingPeerNames.sort().join(',') !== peerNames.sort().join(',')
    : false;
};

const getUnavailableClusters = (clusters: ManagedClusterInfoType[]): string[] =>
  clusters.filter((cluster) => !cluster.isManagedClusterAvailable).map(getName);

/** Provider-independent checks only; storage-specific ones run as the provider's pre-pair checks. */
const isInvalidPolicyCreation = (
  clusters: ManagedClusterInfoType[],
  drPolicies: DRPolicyKind[],
  mirrorPeers: MirrorPeerKind[]
): boolean =>
  checkSyncPolicyExists(clusters.map(getName), drPolicies) ||
  verifyMirrorPeerExistence(clusters, mirrorPeers);

export const SelectedClusterValidation: React.FC<
  SelectedClusterValidationProps
> = ({ selectedClusters, dispatch, mirrorPeers }) => {
  const { t } = useCustomTranslation();

  const [drPolicies, loaded, loadError] = useK8sWatchResource<DRPolicyKind[]>(
    getDRPolicyResourceObj()
  );

  const unavailableClusters = React.useMemo(
    () => getUnavailableClusters(selectedClusters),
    [selectedClusters]
  );
  const isPolicyCreationBlocked = React.useMemo(
    () => isInvalidPolicyCreation(selectedClusters, drPolicies, mirrorPeers),
    [selectedClusters, drPolicies, mirrorPeers]
  );
  const isSelectionValid =
    !unavailableClusters.length && !isPolicyCreationBlocked;

  React.useEffect(() => {
    if (loaded && !loadError) {
      dispatch({
        type: DRPolicyActionType.SET_CLUSTER_SELECTION_VALIDATION,
        payload: isSelectionValid,
      });
    }
  }, [isSelectionValid, loaded, loadError, dispatch]);

  return (
    <StatusBox
      data={selectedClusters}
      loaded={loaded}
      loadError={loadError}
      skeleton={
        <StatusIconAndText
          icon={<Spinner size="sm" />}
          title={t(
            'Running checks to ensure that the selected managed cluster meets all necessary conditions so it can enroll in a Disaster Recovery policy.'
          )}
        />
      }
    >
      {isSelectionValid ? (
        <Alert
          data-test="odf-not-found-alert"
          className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
          title={t(
            'All disaster recovery prerequisites met for both clusters.'
          )}
          variant={AlertVariant.success}
          isInline
        />
      ) : unavailableClusters.length ? (
        <Alert
          data-test="odf-not-found-alert"
          className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
          title={t('1 or more clusters are unavailable.')}
          variant={AlertVariant.danger}
          isInline
        >
          {t(
            'A cluster must be available to enroll in a disaster recovery policy. Unavailable: {{clusterNames}}.',
            { clusterNames: unavailableClusters.join(', ') }
          )}
        </Alert>
      ) : (
        <Alert
          data-test="odf-not-found-alert"
          className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
          title={t('Selected clusters cannot be used to create a DRPolicy.')}
          variant={AlertVariant.danger}
          isInline
        >
          {t(
            'A mirror peer configuration already exists for one or more of the selected clusters, ' +
              'either from an existing or deleted DR policy. To create a new DR policy with these clusters, ' +
              'delete any existing mirror peer configurations associated with them and try again.'
          )}
        </Alert>
      )}
    </StatusBox>
  );
};

type SelectedClusterValidationProps = {
  selectedClusters: ManagedClusterInfoType[];
  dispatch: React.Dispatch<DRPolicyAction>;
  mirrorPeers: MirrorPeerKind[];
};
