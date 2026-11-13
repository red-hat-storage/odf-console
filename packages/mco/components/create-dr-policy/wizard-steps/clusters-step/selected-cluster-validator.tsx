import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { ReplicationType } from '@odf/mco/constants';
import { getDRPolicyResourceObj } from '@odf/mco/hooks';
import {
  DRPolicyKind,
  ManagedClusterInfoType,
  MirrorPeerKind,
} from '@odf/mco/types';
import { getReplicationType } from '@odf/mco/utils';
import { getName, StatusBox } from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  StatusIconAndText,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import {
  Alert,
  AlertVariant,
  Spinner,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
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

const checkClientToODFPeering = (clusters: ManagedClusterInfoType[]): boolean =>
  // ODF cluster to client peering is not supported for DR.
  !!clusters[0]?.odfInfo?.storageClusterInfo?.clientInfo !==
  !!clusters[1]?.odfInfo?.storageClusterInfo?.clientInfo;

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

const validateClusterSelection = (
  clusters: ManagedClusterInfoType[],
  drPolicies: DRPolicyKind[],
  mirrorPeers: MirrorPeerKind[]
): ValidationType => {
  const isThirdPartyPath = clusters.every(
    (cluster) =>
      !cluster?.odfInfo || cluster?.odfInfo?.storageClusterCount === 0
  );

  const validation: ValidationType = clusters.reduce(
    (acc, cluster) => {
      if (!isThirdPartyPath) {
        const name = getName(cluster);
        const { odfInfo } = cluster;
        const { isValidODFVersion, storageClusterInfo, storageClusterCount } =
          cluster?.odfInfo || {};
        if (!odfInfo || storageClusterCount === 0) {
          acc.clusterValidation.clustersWithoutODF.push(name);
        }
        if (!isValidODFVersion) {
          acc.clusterValidation.clustersWithUnsupportedODF.push(name);
        }
        if (!storageClusterInfo?.cephFSID) {
          acc.clusterValidation.clustersWithUnsuccessfullODF.push(name);
        }
        if (storageClusterCount > 1) {
          acc.clusterValidation.clustersWithMultipleStorageInstances.push(name);
        }
      }
      return acc;
    },
    {
      clusterValidation: {
        clustersWithUnsupportedODF: [],
        clustersWithoutODF: [],
        clustersWithUnsuccessfullODF: [],
        clustersWithMultipleStorageInstances: [],
      },
    } as ValidationType
  );

  validation.peeringValidation = {
    unSupportedPeering: isThirdPartyPath
      ? false
      : checkClientToODFPeering(clusters),
    invalidPolicyCreation:
      checkSyncPolicyExists(clusters.map(getName), drPolicies) ||
      verifyMirrorPeerExistence(clusters, mirrorPeers),
  };

  return validation;
};

const getPeeringValidationMessage = (
  peeringValidation: PeeringValidationType,
  t: TFunction<string>
): PeeringValidationMessageType => {
  if (peeringValidation.unSupportedPeering) {
    return {
      title: t('Unsupported peering configuration.'),
      description: t(
        'The selected clusters cannot be peered due to a mismatch in types. ' +
          'Ensure both clusters are of the same type to continue.'
      ),
    };
  } else if (peeringValidation.invalidPolicyCreation) {
    return {
      title: t('Selected clusters cannot be used to create a DRPolicy.'),
      description: t(
        'A mirror peer configuration already exists for one or more of the selected clusters, ' +
          'either from an existing or deleted DR policy. To create a new DR policy with these clusters, ' +
          'delete any existing mirror peer configurations associated with them and try again.'
      ),
    };
  }
};

const getClusterValidationMessage = (
  clusterName: string,
  clusterValidation: ClusterValidationType,
  requiredODFVersion: string,
  t: TFunction<string>
): string[] => {
  const errorMessages: string[] = [];

  clusterValidation?.clustersWithUnsupportedODF.includes(clusterName) &&
    errorMessages.push(
      t('Data foundation must be {{version}} or above.', {
        version: requiredODFVersion,
      })
    );

  clusterValidation?.clustersWithUnsuccessfullODF.includes(clusterName) &&
    errorMessages.push(t('Must be connected to RHCS.'));

  clusterValidation?.clustersWithMultipleStorageInstances.includes(
    clusterName
  ) && errorMessages.push(t('The cluster has multiple storage instances.'));

  return errorMessages;
};

const ClusterValidationMessage: React.FC<ClusterValidationMessageProps> = ({
  clusterName,
  clusterValidation,
  requiredODFVersion,
}) => {
  const { t } = useCustomTranslation();
  const errorMessages: string[] = getClusterValidationMessage(
    clusterName,
    clusterValidation,
    requiredODFVersion,
    t
  );
  const isClusterWithoutODF =
    clusterValidation.clustersWithoutODF.includes(clusterName);
  const title = isClusterWithoutODF
    ? t('Checks cannot be performed for the {{clusterName}}:', { clusterName })
    : pluralize(
        errorMessages.length,
        t('check unsuccessful on the {{clusterName}}:', { clusterName }),
        t('checks unsuccessful on the {{clusterName}}:', { clusterName })
      );

  return (
    <div className="pf-v6-u-mt-md">
      <Content component={ContentVariants.h5}>{title}</Content>
      {isClusterWithoutODF ? (
        <Alert
          data-test="odf-not-found-alert"
          className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
          title={t(
            'We could not retrieve any information about the managed cluster {{clusterName}}',
            { clusterName }
          )}
          variant={AlertVariant.danger}
          isInline
        />
      ) : (
        errorMessages.map((errorMessage, index) => (
          <StatusIconAndText
            className="pf-v6-u-ml-sm"
            icon={<TimesIcon className="pf-v6-u-icon-color-status-danger" />}
            title={errorMessage}
            key={`${clusterName}-error-${index}`}
          />
        ))
      )}
    </div>
  );
};

const PeeringValidationMessage: React.FC<PeeringValidationMessageProps> = ({
  peeringValidation,
}) => {
  const { t } = useCustomTranslation();
  const peeringValidationMessage: PeeringValidationMessageType =
    getPeeringValidationMessage(peeringValidation, t);
  return (
    <Alert
      data-test="odf-not-found-alert"
      className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
      title={peeringValidationMessage.title}
      variant={AlertVariant.danger}
      isInline
    >
      {peeringValidationMessage.description}
    </Alert>
  );
};

export const SelectedClusterValidation: React.FC<
  SelectedClusterValidationProps
> = ({ selectedClusters, requiredODFVersion, dispatch, mirrorPeers }) => {
  const { t } = useCustomTranslation();

  const [drPolicies, policyLoaded, policyLoadError] = useK8sWatchResource<
    DRPolicyKind[]
  >(getDRPolicyResourceObj());

  const loaded = policyLoaded;
  const loadError = policyLoadError;

  const validations: ValidationType = React.useMemo(
    () => validateClusterSelection(selectedClusters, drPolicies, mirrorPeers),
    [selectedClusters, drPolicies, mirrorPeers]
  );

  const { peeringValidation, clusterValidation } = validations;

  // Extract invalid clusters without memo
  const invalidClusters: string[] = Array.from(
    new Set([].concat(...Object.values(clusterValidation)))
  );

  // Determine peering validity
  const isInvalidPeering = Object.values(peeringValidation).some(Boolean);

  // Determine selection validity
  const isSelectionValid = !isInvalidPeering && !invalidClusters.length;

  // Dispatch selection validation state
  React.useEffect(() => {
    if (loaded && !loadError) {
      dispatch({
        type: DRPolicyActionType.SET_CLUSTER_SELECTION_VALIDATION,
        payload: isSelectionValid,
      });
    }
  }, [isSelectionValid, loaded, loadError, dispatch]);

  // Check for version mismatch
  const isVersionMismatch =
    selectedClusters[0]?.odfInfo?.odfVersion !==
    selectedClusters[1]?.odfInfo?.odfVersion;

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
        <>
          <Alert
            data-test="odf-not-found-alert"
            className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
            title={t(
              'All disaster recovery prerequisites met for both clusters.'
            )}
            variant={AlertVariant.success}
            isInline
          />
          {isVersionMismatch && (
            <Alert
              data-test="odf-not-found-alert"
              className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
              title={t('Version mismatch across selected clusters')}
              variant={AlertVariant.warning}
              isInline
            >
              {t(
                'The selected clusters are running different versions of Data Foundation. Peering clusters with different versions can lead to potential issues and is not recommended. Ensure all clusters are upgraded to the same version before proceeding with peering to avoid operational risks.'
              )}
            </Alert>
          )}
        </>
      ) : isInvalidPeering ? (
        <PeeringValidationMessage peeringValidation={peeringValidation} />
      ) : (
        <>
          <Alert
            data-test="odf-not-found-alert"
            className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
            title={t(
              '1 or more clusters do not meet disaster recovery cluster prerequisites.'
            )}
            variant={AlertVariant.danger}
            isInline
          >
            {t(
              'The selected managed cluster(s) does not meet all necessary conditions to be eligible for disaster recovery policy. Resolve the following issues to proceed with policy creation.'
            )}
          </Alert>
          {invalidClusters.map((clusterName) => (
            <ClusterValidationMessage
              clusterValidation={clusterValidation}
              clusterName={clusterName}
              requiredODFVersion={requiredODFVersion}
              key={clusterName}
            />
          ))}
        </>
      )}
    </StatusBox>
  );
};

type SelectedClusterValidationProps = {
  selectedClusters: ManagedClusterInfoType[];
  requiredODFVersion: string;
  dispatch: React.Dispatch<DRPolicyAction>;
  mirrorPeers: MirrorPeerKind[];
};

type PeeringValidationType = {
  unSupportedPeering: boolean;
  invalidPolicyCreation: boolean;
};

type ClusterValidationType = {
  clustersWithUnsupportedODF: string[];
  clustersWithoutODF: string[];
  clustersWithUnsuccessfullODF: string[];
  clustersWithMultipleStorageInstances: string[];
};

type ValidationType = {
  clusterValidation: ClusterValidationType;
  peeringValidation: PeeringValidationType;
};

type ClusterValidationMessageProps = {
  clusterName: string;
  clusterValidation: ClusterValidationType;
  requiredODFVersion: string;
};

type PeeringValidationMessageProps = {
  peeringValidation: PeeringValidationType;
};

type PeeringValidationMessageType = {
  title: string;
  description?: React.ReactNode;
};
