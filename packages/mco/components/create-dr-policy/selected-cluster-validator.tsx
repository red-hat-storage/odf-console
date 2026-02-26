import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { ReplicationType, STORAGE_ID_LABEL_KEY } from '@odf/mco/constants';
import { getDRPolicyResourceObj, useACMSafeFetch } from '@odf/mco/hooks';
import {
  DRPolicyKind,
  MirrorPeerKind,
  SearchResult,
  SearchResultItemType,
} from '@odf/mco/types';
import {
  getLabelsFromSearchResult,
  getReplicationType,
  queryStorageClassesUsingClusterNames,
} from '@odf/mco/utils';
import { fireManagedClusterView } from '@odf/mco/utils/managed-cluster-view';
import {
  getName,
  StatusBox,
  CEPH_PROVISIONERS,
  StorageClassModel,
  IBM_PROVISIONERS,
} from '@odf/shared';
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
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import {
  DRPolicyAction,
  DRPolicyActionType,
  ManagedClusterInfoType,
} from './utils/reducer';
import './create-dr-policy.scss';
import '../../style.scss';

const PROVISIONER = 'provisioner';
const EXTERNAL_DEPLOYMENT_TYPE = 'external';

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
  mirrorPeers: MirrorPeerKind[],
  isStorageClassesValid: boolean
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
    unSupportedPeering: checkClientToODFPeering(clusters),
    invalidPolicyCreation:
      checkSyncPolicyExists(clusters.map(getName), drPolicies) ||
      verifyMirrorPeerExistence(clusters, mirrorPeers),
    unSupportedStorageClasses: !isStorageClassesValid,
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
  } else if (peeringValidation.unSupportedStorageClasses) {
    return {
      title: t('Cannot proceed with policy creation.'),
      description: t(
        'No common storage class found for the selected managed clusters. ' +
          'To create a DR policy, a common storage class must exist, ' +
          'if not configured already, provision a common storage class and try again.'
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
            className="pf-v6-u-ml-sm"
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

// Fetch provisioner if missing
const fetchProvisionerIfMissing = async (
  scName: string,
  clusterName: string,
  t: TFunction
) => {
  const viewResponse = await fireManagedClusterView(
    scName,
    '',
    StorageClassModel.kind,
    StorageClassModel.apiVersion,
    StorageClassModel.apiGroup,
    clusterName,
    t
  );
  return viewResponse;
};

// Build cluster-to-SC map with provisioner validation
export const getClusterToSCMap = async (
  searchResult: SearchResult,
  searchLoaded: boolean,
  searchError: any,
  t: TFunction
): Promise<Map<ClusterNameType, string[]>> => {
  const clusterToSCMap: Map<ClusterNameType, string[]> = new Map();

  if (searchLoaded && !searchError) {
    const allSCs =
      searchResult.data.searchResult?.flatMap((result) => result.items) || [];
    const provisionerResults = await Promise.all(
      allSCs.map(async (sc) => {
        const clusterName = sc.cluster;
        let provisioner: string = sc?.[PROVISIONER] ?? '';

        // Fetch missing provisioner if necessary
        if (!provisioner) {
          const viewResponse = await fetchProvisionerIfMissing(
            sc.name,
            clusterName,
            t
          );
          provisioner = viewResponse.result?.[PROVISIONER] ?? '';
        }

        const storageID = getStorageID(sc);
        if (
          (isValidCephProvisioner(provisioner) ||
            isValidIBMProvisioner(provisioner)) &&
          storageID !== ''
        ) {
          const scString = formatStorageClassString(sc.name, provisioner);

          return { clusterName, scString };
        } else {
          // eslint-disable-next-line no-console
          console.warn(`Skipping invalid provisioner: ${provisioner}`);
          return null; // Return null for skipped ones
        }
      })
    );

    // Populate the map from the results
    provisionerResults
      .filter(Boolean) // Remove null entries from invalid provisioners
      .forEach(({ clusterName, scString }) => {
        const existingSCs = clusterToSCMap.get(clusterName) ?? [];
        existingSCs.push(scString);
        clusterToSCMap.set(clusterName, existingSCs);
      });
  }

  return clusterToSCMap;
};

// Optimized comparison using Set
const findSupportedStorageClasses = (
  firstClusterSCs: string[],
  secondClusterSCs: string[]
): boolean => {
  const secondClusterSet = new Set(secondClusterSCs);
  return firstClusterSCs.some((sc) => secondClusterSet.has(sc));
};

// Ensure both clusters have at least pair of valid storage class
const validateClusterDetails = (
  clusterToSCMap: Map<ClusterNameType, string[]>
): boolean => {
  const [firstClusterSCs = [], secondClusterSCs = []] = Array.from(
    clusterToSCMap.values()
  );

  return findSupportedStorageClasses(firstClusterSCs, secondClusterSCs);
};

// Main hook for storage class validation
const useStorageClassValidation = (
  selectedClusters: ManagedClusterInfoType[],
  t: TFunction
): [boolean, boolean, any] => {
  const [result, setResult] = React.useState<boolean>(false);
  const [isCompleted, setCompleted] = React.useState(false);
  const [clusterSCMapError, setClusterSCMapError] = React.useState<
    string | null
  >(null);

  // Early return if both clusters are "external"
  const allExternal = selectedClusters.every(
    (cluster) =>
      cluster.odfInfo?.storageClusterInfo?.deploymentType ===
      EXTERNAL_DEPLOYMENT_TYPE
  );

  const searchQuery = React.useMemo(
    () => queryStorageClassesUsingClusterNames(selectedClusters.map(getName)),
    [selectedClusters]
  );

  const [searchResult, searchError, searchLoaded] =
    useACMSafeFetch(searchQuery);

  React.useEffect(() => {
    if (!allExternal) {
      setCompleted(false);
      if (searchLoaded && !searchError) {
        getClusterToSCMap(searchResult, searchLoaded, searchError, t)
          .then((clusterToSCMap) => {
            setResult(validateClusterDetails(clusterToSCMap));
            setCompleted(true);
          })
          .catch((error) => {
            setClusterSCMapError(
              error instanceof Error
                ? error.message
                : t('something went wrong while getting storageclasses')
            );
            setCompleted(true);
          });
      } else if (searchError) {
        setCompleted(true);
      }
    } else {
      // Ignore validation for external clusters
      setResult(true);
      setCompleted(true);
    }
  }, [
    allExternal,
    searchResult,
    searchError,
    searchLoaded,
    t,
    setCompleted,
    setResult,
  ]);

  return [result, isCompleted, searchError || clusterSCMapError];
};

// Helper functions
const getStorageID = (sc: SearchResultItemType) => {
  return getLabelsFromSearchResult(sc)?.[STORAGE_ID_LABEL_KEY]?.[0] ?? '';
};

const formatStorageClassString = (name: string, provisioner: string) => {
  return `${name}/${provisioner}`;
};

const isValidCephProvisioner = (provisioner: string) => {
  return CEPH_PROVISIONERS.some((allowedProvisioner) =>
    provisioner.includes(allowedProvisioner)
  );
};
const isValidIBMProvisioner = (provisioner: string) => {
  return IBM_PROVISIONERS.some((allowedProvisioner) =>
    provisioner.includes(allowedProvisioner)
  );
};

export const SelectedClusterValidation: React.FC<
  SelectedClusterValidationProps
> = ({ selectedClusters, requiredODFVersion, dispatch, mirrorPeers }) => {
  const { t } = useCustomTranslation();

  // Fetch policies and storage class validation in parallel
  const [drPolicies, policyLoaded, policyLoadError] = useK8sWatchResource<
    DRPolicyKind[]
  >(getDRPolicyResourceObj());
  const [isValidStorageClasses, scLoaded, scLoadError] =
    useStorageClassValidation(selectedClusters, t);

  // Consolidate loading and error states
  const loaded = policyLoaded && scLoaded;
  const loadError = policyLoadError || scLoadError;

  // Memoized validations
  const validations: ValidationType = React.useMemo(
    () =>
      validateClusterSelection(
        selectedClusters,
        drPolicies,
        mirrorPeers,
        isValidStorageClasses
      ),
    [selectedClusters, drPolicies, mirrorPeers, isValidStorageClasses]
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
            className="odf-alert mco-create-data-policy__alert"
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
  unSupportedStorageClasses: boolean;
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

type ClusterNameType = string;
