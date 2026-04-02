import * as React from 'react';
import { CORSRule, GetBucketCorsCommandOutput } from '@aws-sdk/client-s3';
import { CorsDetailsContent } from '@odf/core/components/s3-browser/cors-details/CorsDetailsPage';
import { AllowedMethods } from '@odf/core/components/s3-browser/create-or-edit-cors-rules/reducer';
import { BUCKET_CORS_RULE_CACHE_KEY_SUFFIX } from '@odf/core/constants';
import { WILDCARD } from '@odf/shared/constants';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { isNoCorsRuleError } from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { murmur3 } from 'murmurhash-js';
import { useSWRConfig } from 'swr';
import { Button, ButtonVariant } from '@patternfly/react-core';

type ClientCorsConfigModalExtraProps = {
  s3Client: S3Commands;
  bucketName: string;
  triggerRefresh?: () => void;
};

const ClientCorsConfigModal: React.FC<
  CommonModalProps<ClientCorsConfigModalExtraProps>
> = ({ closeModal, isOpen, extraProps: { s3Client, bucketName } }) => {
  const { t } = useCustomTranslation();
  const { mutate } = useSWRConfig();
  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  const clientCorsConfig: CORSRule = React.useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const originHash = murmur3(origin || 'unknown-origin');

    return {
      ID: `odf-client-console-s3-browser-${originHash}`,
      AllowedOrigins: origin ? [origin] : [],
      AllowedMethods: [...Object.values(AllowedMethods)],
      AllowedHeaders: [WILDCARD],
    };
  }, []);

  const onEnable = async (event: React.FormEvent) => {
    event.preventDefault();
    setInProgress(true);
    setError(undefined);

    try {
      let latestRules: GetBucketCorsCommandOutput;

      try {
        latestRules = await s3Client.getBucketCors({ Bucket: bucketName });
      } catch (err) {
        if (isNoCorsRuleError(err)) {
          latestRules = { CORSRules: [] } as GetBucketCorsCommandOutput;
        } else {
          throw err;
        }
      }

      const currRules =
        latestRules?.CORSRules?.filter(
          (rule) => rule.ID !== clientCorsConfig.ID
        ) || [];

      await s3Client.putBucketCors({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [...currRules, clientCorsConfig],
        },
      });

      const cacheKey = `${s3Client.providerType}-${bucketName}-${BUCKET_CORS_RULE_CACHE_KEY_SUFFIX}`;
      await mutate(cacheKey);

      setInProgress(false);
      closeModal();
    } catch (err) {
      setInProgress(false);
      setError(err as Error);
    }
  };

  return (
    <Modal
      title={t('Enable CORS?')}
      isOpen={isOpen}
      onClose={closeModal}
      description={
        <div className="text-muted">
          {t(
            'Enabling CORS will allow browsers to request resources from the bucket.'
          )}
        </div>
      }
      variant={ModalVariant.large}
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || JSON.stringify(error)}
        >
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={onEnable}
              isDisabled={inProgress}
              className="pf-v6-u-mr-xs"
            >
              {t('Enable')}
            </Button>
            <Button
              variant={ButtonVariant.secondary}
              onClick={closeModal}
              className="pf-v6-u-ml-xs"
            >
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <CorsDetailsContent corsRule={clientCorsConfig} />
    </Modal>
  );
};

export default ClientCorsConfigModal;
