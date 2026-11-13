import * as React from 'react';
import { getDescriptorById } from '@odf/mco/utils/storage-vendor-registry';
import { DOC_VERSION, tpsDoc } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  AlertVariant,
  Form,
  FormGroup,
  Title,
} from '@patternfly/react-core';
import { DRPolicyAction, DRPolicyState } from '../../utils/reducer';
import { PrePairChecksRunner } from './pre-pair-checks-runner';
import { ClusterS3BucketDetailsForm } from './s3-bucket-details/s3-bucket-details-form';
import ThirdPartyStorageWarning from './third-party-storage-alert';

type ConfigureClusterPairStepProps = Pick<
  DRPolicyState['configure'],
  'cluster1S3Details' | 'cluster2S3Details' | 'useSameS3Connection'
> &
  Pick<DRPolicyState['clusters'], 'selectedClusters'> &
  Pick<DRPolicyState['provider'], 'storageVendor'> & {
    dispatch: React.Dispatch<DRPolicyAction>;
    clustersWithS3Configuration: Set<string>;
    acknowledgedChecks: Set<string>;
    onAcknowledgeCheck: (checkId: string, acknowledged: boolean) => void;
    docHref?: string;
    errorMessage?: string;
  };

export const ConfigureClusterPairStep: React.FC<
  ConfigureClusterPairStepProps
> = ({
  storageVendor,
  selectedClusters,
  cluster1S3Details,
  cluster2S3Details,
  useSameS3Connection,
  dispatch,
  clustersWithS3Configuration,
  acknowledgedChecks,
  onAcknowledgeCheck,
  docHref,
  errorMessage,
}) => {
  const { t } = useCustomTranslation();
  const clusterNames = selectedClusters.map(getName);
  const descriptor = storageVendor ? getDescriptorById(storageVendor) : null;
  const hasPrePairChecks = descriptor && descriptor.prePairChecks.length > 0;
  const isThirdParty = descriptor && descriptor.id !== 'data-foundation';

  return (
    <Form className="mco-create-data-policy__body">
      <Title headingLevel="h2" size="lg" className="pf-v6-u-mb-md">
        {t('Configure cluster pair')}
      </Title>

      {hasPrePairChecks && descriptor && (
        <PrePairChecksRunner
          clusterNames={clusterNames}
          descriptor={descriptor}
          enabled={true}
          acknowledgedChecks={acknowledgedChecks}
          onAcknowledgeCheck={onAcknowledgeCheck}
          docHref={docHref}
        />
      )}

      {isThirdParty && (
        <>
          <ThirdPartyStorageWarning docHref={tpsDoc(DOC_VERSION)} />
          <FormGroup
            fieldId="add-s3-bucket-details"
            label={t('Replication site')}
          >
            <ClusterS3BucketDetailsForm
              selectedClusters={selectedClusters}
              cluster1Details={cluster1S3Details}
              cluster2Details={cluster2S3Details}
              useSameConnection={useSameS3Connection}
              clustersWithS3Configuration={clustersWithS3Configuration}
              dispatch={dispatch}
            />
          </FormGroup>
          {!!errorMessage && (
            <FormGroup fieldId="error-message">
              <Alert
                className="odf-alert mco-create-data-policy__alert pf-v6-u-mb-xs"
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
    </Form>
  );
};
