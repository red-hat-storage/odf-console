import * as React from 'react';
import { DOC_VERSION, tpsDoc } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ExternalLink } from '@odf/shared/utils';
import { Trans } from 'react-i18next';
import {
  Alert,
  AlertVariant,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { BackendType, MAX_ALLOWED_CLUSTERS } from '../../constants';
import { DRClusterKind, MirrorPeerKind } from '../../types';
import { ClusterS3BucketDetailsForm } from './add-s3-bucket-details/s3-bucket-details-form';
import { SelectClusterList } from './select-cluster-list';
import { SelectReplicationBackend } from './select-replication-backend/select-replication-backend';
import { SelectedClusterValidation } from './selected-cluster-validator';
import ThirdPartyStorageWarning from './third-party-storage-alert';
import { DRPolicyAction, DRPolicyState } from './utils/reducer';

export const ClustersStep: React.FC<ClustersStepProps> = ({
  state,
  dispatch,
  requiredODFVersion,
  preSelectedClusters,
  acmDoc,
  mirrorPeers,
  clusterNames,
  selectedDRClusters,
  errorMessage,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Form className="mco-create-data-policy__body">
      <FormGroup fieldId="connect-clusters" label={t('Connect clusters')}>
        <FormHelperText>
          <HelperText className="mco-create-data-policy__text-input">
            <HelperTextItem>
              {t(
                'Enables mirroring/replication between two selected clusters, ensuring failover or relocation between the two clusters in the event of an outage or planned maintenance.'
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
        <SelectClusterList
          selectedClusters={state.selectedClusters}
          requiredODFVersion={requiredODFVersion}
          dispatch={dispatch}
          preSelectedClusterNames={preSelectedClusters}
          showOnlyPreselected={preSelectedClusters.length > 0}
        />
      </FormGroup>
      <FormGroup>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              <Trans>
                Note: If your managed cluster does not appear here, confirm it
                is successfully imported and refer to the{' '}
                <ExternalLink href={acmDoc}>RHACM documentation</ExternalLink>{' '}
                for more details.
              </Trans>
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      {state.selectedClusters.length === MAX_ALLOWED_CLUSTERS && (
        <>
          <FormGroup fieldId="cluster-selection-validation">
            <SelectedClusterValidation
              selectedClusters={state.selectedClusters}
              requiredODFVersion={requiredODFVersion}
              dispatch={dispatch}
              mirrorPeers={mirrorPeers}
            />
          </FormGroup>
          {state.isClusterSelectionValid && (
            <>
              {!state.selectedClustersHaveODF &&
                state.selectedClusters.some(
                  (cluster) => cluster?.odfInfo?.storageClusterCount > 0
                ) && (
                  <FormGroup
                    fieldId="select-backend"
                    label={t('Select replication')}
                  >
                    <FormHelperText>
                      <HelperText className="mco-create-data-policy__text-input">
                        <HelperTextItem>
                          {t(
                            'All disaster recovery prerequisites are met for both clusters. Multiple storage backends are available on both of the selected clusters.'
                          )}
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                    <SelectReplicationBackend
                      clusterNames={clusterNames}
                      doClustersHaveODF={state.selectedClustersHaveODF}
                      dispatch={dispatch}
                      selectedKey={state.replicationBackend}
                    />
                  </FormGroup>
                )}
              {!state.selectedClustersHaveODF &&
                state.replicationBackend === BackendType.ThirdParty && (
                  <>
                    <ThirdPartyStorageWarning docHref={tpsDoc(DOC_VERSION)} />
                    <FormGroup
                      fieldId="add-s3-bucket-details"
                      label={t('Replication site')}
                    >
                      <FormHelperText>
                        <HelperText className="mco-create-data-policy__text-input">
                          <HelperTextItem>
                            {t(
                              'Provide S3 bucket connection details for each managed cluster. If a S3 bucket is not already configured for cluster, create one and then continue.'
                            )}
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                      <ClusterS3BucketDetailsForm
                        selectedClusters={state.selectedClusters}
                        cluster1Details={state.cluster1S3Details}
                        cluster2Details={state.cluster2S3Details}
                        useSameConnection={state.useSameS3Connection}
                        existingDRClusterNames={
                          new Set(selectedDRClusters.map(getName))
                        }
                        dispatch={dispatch}
                      />
                    </FormGroup>
                  </>
                )}
              {!!errorMessage && (
                <FormGroup fieldId="error-message">
                  <Alert
                    className="odf-alert mco-create-data-policy__alert"
                    title={t('An error occurred')}
                    variant={AlertVariant.danger}
                    isInline
                  >
                    {errorMessage}
                  </Alert>
                </FormGroup>
              )}
            </>
          )}
        </>
      )}
    </Form>
  );
};

type ClustersStepProps = {
  state: DRPolicyState;
  dispatch: React.Dispatch<DRPolicyAction>;
  requiredODFVersion: string;
  preSelectedClusters: string[];
  acmDoc: string;
  mirrorPeers: MirrorPeerKind[];
  clusterNames: string[];
  selectedDRClusters: DRClusterKind[];
  errorMessage: string;
};
