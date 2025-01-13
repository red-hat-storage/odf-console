import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { ReplicationType } from '@odf/mco/constants';
import { getDRPolicyResourceObj } from '@odf/mco/hooks';
import { DRPolicyKind, MirrorPeerKind } from '@odf/mco/types';
import { getReplicationType } from '@odf/mco/utils';
import { getName, StatusBox } from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  StatusIconAndText,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import {
  Alert,
  AlertVariant,
  Spinner,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import {
  DRPolicyAction,
  DRPolicyActionType,
  ManagedClusterInfoType,
} from './utils/reducer';
import './create-dr-policy.scss';
import '../../style.scss';

const checkSyncPolicyExists = (
  clusters: string[],
  drPolicies: DRPolicyKind[]
): boolean =>
  drPolicies.some((drPolicy) => {
    const { drClusters, schedulingInterval } = drPolicy.spec;
    const isSyncPolicy =
      getReplicationType(schedulingInterval) === ReplicationType.SYNC;
    return (
      isSyncPolicy && drClusters.every((cluster) => clusters.includes(cluster))
    );
  });

const checkClientToClientPeering = (
  clusters: ManagedClusterInfoType[]
): boolean => {
  const odfConfigInfo1 = clusters[0]?.odfInfo?.storageClusterInfo;
  const odfConfigInfo2 = clusters[1]?.odfInfo?.storageClusterInfo;
  if (!!odfConfigInfo1?.clientInfo && !!odfConfigInfo2?.clientInfo) {
    // Clients from same provider are not supported for DR.
    return odfConfigInfo1.cephFSID === odfConfigInfo2.cephFSID;
  }
  return false;
};

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
  const validation: ValidationType = clusters.reduce(
    (acc, cluster) => {
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
    unSupportedPeering:
      checkClientToClientPeering(clusters) || checkClientToODFPeering(clusters),
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
        "The clusters you're trying to peer aren't compatible. " +
          'It could be due to mismatched types (one with a client, the other without) ' +
          'or both using the same Data Foundation provider. Select clusters that are either ' +
          'the same type or have separate providers to continue.'
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
    <div className="pf-v5-u-mt-md">
      <Text component={TextVariants.h5}>{title}</Text>
      {isClusterWithoutODF ? (
        <Alert
          data-test="odf-not-found-alert"
          className="odf-alert mco-create-data-policy__alert"
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
            className="pf-v5-u-ml-sm"
            icon={<TimesIcon color="var(--pf-global--danger-color--100)" />}
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
      className="odf-alert mco-create-data-policy__alert"
      title={peeringValidationMessage.title}
      variant={AlertVariant.danger}
      isInline
    >
      {peeringValidationMessage.description}
    </Alert>
  );
};

export const SelectedClusterValidation: React.FC<SelectedClusterValidationProps> =
  ({ selectedClusters, requiredODFVersion, dispatch, mirrorPeers }) => {
    const { t } = useCustomTranslation();

    const [drPolicies, policyLoaded, policyLoadError] = useK8sWatchResource<
      DRPolicyKind[]
    >(getDRPolicyResourceObj());

    let isSelectionValid: boolean = false;

    React.useEffect(() => {
      if (policyLoaded && !policyLoadError) {
        dispatch({
          type: DRPolicyActionType.SET_CLUSTER_SELECTION_VALIDATION,
          payload: isSelectionValid,
        });
      }
    }, [isSelectionValid, policyLoaded, policyLoadError, dispatch]);

    const validations: ValidationType = validateClusterSelection(
      selectedClusters,
      drPolicies,
      mirrorPeers
    );

    const { peeringValidation, clusterValidation } = validations;

    const invalidClusters: string[] = Array.from(
      new Set([].concat(...Object.values(clusterValidation)))
    );

    const isInvalidPeering: boolean = Object.values(peeringValidation).some(
      (validation) => validation
    );

    isSelectionValid = !isInvalidPeering && !invalidClusters.length;

    // Warning
    const isVersionMismatch =
      selectedClusters[0].odfInfo?.odfVersion !==
      selectedClusters[1].odfInfo?.odfVersion;

    return (
      <StatusBox
        data={selectedClusters}
        loaded={policyLoaded}
        loadError={policyLoadError}
        skeleton={
          <StatusIconAndText
            icon={<Spinner size="sm" />}
            title={t(
              'Running checks to ensure that the selected managed cluster meets ' +
                'all necessary conditions so it can enroll in a Disaster Recovery policy.'
            )}
          />
        }
      >
        {isSelectionValid ? (
          <>
            <Alert
              data-test="odf-not-found-alert"
              className="odf-alert mco-create-data-policy__alert"
              title={t(
                'All disaster recovery prerequisites met for both clusters.'
              )}
              variant={AlertVariant.success}
              isInline
            />
            {isVersionMismatch && (
              <Alert
                data-test="odf-not-found-alert"
                className="odf-alert mco-create-data-policy__alert"
                title={t('Version mismatch across selected clusters')}
                variant={AlertVariant.warning}
                isInline
              >
                {t(
                  'The selected clusters are running different versions of Data Foundation. ' +
                    'Peering clusters with different versions can lead to potential issues and is not recommended. ' +
                    'Ensure all clusters are upgraded to the same version before proceeding with peering to avoid operational risks.'
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
              className="odf-alert mco-create-data-policy__alert"
              title={t(
                '1 or more clusters do not meet disaster recovery cluster prerequisites.'
              )}
              variant={AlertVariant.danger}
              isInline
            >
              {t(
                'The selected managed cluster(s) does not meet all necessary conditions ' +
                  'to be eligible for disaster recovery policy. Resolve the following ' +
                  'issues to proceed with policy creation.'
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
