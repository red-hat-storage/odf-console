import * as React from 'react';
import { PrePairCheckId } from '@odf/mco/constants';
import type { ManagedClusterInfoType } from '@odf/mco/types';
import type { PrePairCheckResult } from '@odf/mco/utils/storage-vendor-registry';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { StatusIconAndText } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  AlertVariant,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import type {
  PrePairCheck,
  PrePairCheckInput,
  PrePairCheckRenderProps,
} from './types';

/** Unsupported ODF never gets here: the Provider step hides Data Foundation for it. */
type OdfPrerequisitesData = {
  clustersWithoutCephFSID: string[];
  clustersWithMultipleStorageInstances: string[];
  isClientToODFPeering: boolean;
  isVersionMismatch: boolean;
};

const getOdfPrerequisites = (
  clusters: ManagedClusterInfoType[]
): OdfPrerequisitesData => ({
  clustersWithoutCephFSID: clusters
    .filter((cluster) => !cluster.odfInfo?.storageClusterInfo?.cephFSID)
    .map(getName),
  clustersWithMultipleStorageInstances: clusters
    .filter((cluster) => cluster.odfInfo?.storageClusterCount > 1)
    .map(getName),
  // ODF cluster to client peering is not supported for DR.
  isClientToODFPeering:
    clusters.length === 2 &&
    !!clusters[0].odfInfo?.storageClusterInfo?.clientInfo !==
      !!clusters[1].odfInfo?.storageClusterInfo?.clientInfo,
  isVersionMismatch:
    clusters.length === 2 &&
    clusters[0].odfInfo?.odfVersion !== clusters[1].odfInfo?.odfVersion,
});

const useOdfPrerequisitesCheck = ({
  clusters,
  enabled,
}: PrePairCheckInput): PrePairCheckResult<OdfPrerequisitesData> => {
  const data = React.useMemo(() => getOdfPrerequisites(clusters), [clusters]);
  const canProceed =
    !enabled ||
    (!data.clustersWithoutCephFSID.length &&
      !data.clustersWithMultipleStorageInstances.length &&
      !data.isClientToODFPeering);

  return {
    id: PrePairCheckId.OdfPrerequisites,
    loaded: true,
    loadError: null,
    canProceed,
    data,
  };
};

const OdfPrerequisitesRender: React.FC<
  PrePairCheckRenderProps<OdfPrerequisitesData>
> = ({ clusterNames, result }) => {
  const { t } = useCustomTranslation();
  const data = result.data as OdfPrerequisitesData;

  if (!data) {
    return null;
  }

  if (data.isClientToODFPeering) {
    return (
      <Alert
        className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
        title={t('Unsupported peering configuration.')}
        variant={AlertVariant.danger}
        isInline
      >
        {t(
          'The selected clusters cannot be peered due to a mismatch in types. ' +
            'Ensure both clusters are of the same type to continue.'
        )}
      </Alert>
    );
  }

  if (!result.canProceed) {
    return (
      <>
        <Alert
          className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
          title={t(
            '1 or more clusters do not meet Data Foundation disaster recovery prerequisites.'
          )}
          variant={AlertVariant.danger}
          isInline
        />
        {clusterNames.map((clusterName) => {
          const errorMessages = [
            ...(data.clustersWithoutCephFSID.includes(clusterName)
              ? [t('Must be connected to RHCS.')]
              : []),
            ...(data.clustersWithMultipleStorageInstances.includes(clusterName)
              ? [t('The cluster has multiple storage instances.')]
              : []),
          ];
          return errorMessages.length ? (
            <div key={clusterName} className="pf-v6-u-mt-md">
              <Content component={ContentVariants.h5}>{clusterName}</Content>
              {errorMessages.map((errorMessage) => (
                <StatusIconAndText
                  key={errorMessage}
                  className="pf-v6-u-ml-sm"
                  icon={
                    <TimesIcon className="pf-v6-u-icon-color-status-danger" />
                  }
                  title={errorMessage}
                />
              ))}
            </div>
          ) : null;
        })}
      </>
    );
  }

  if (data.isVersionMismatch) {
    return (
      <Alert
        className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
        title={t('Version mismatch across selected clusters')}
        variant={AlertVariant.warning}
        isInline
      >
        {t(
          'The selected clusters are running different versions of Data Foundation. Peering clusters with different versions can lead to potential issues and is not recommended. Ensure all clusters are upgraded to the same version before proceeding with peering to avoid operational risks.'
        )}
      </Alert>
    );
  }

  return null;
};

export const odfPrerequisitesCheck: PrePairCheck = {
  id: PrePairCheckId.OdfPrerequisites,
  useCheck: useOdfPrerequisitesCheck,
  Render: OdfPrerequisitesRender,
};
