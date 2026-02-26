import * as React from 'react';
import { CORSRule, GetBucketCorsCommandOutput } from '@aws-sdk/client-s3';
import { getBucketOverviewBaseRoute } from '@odf/core/constants';
import { S3ProviderType } from '@odf/core/types';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { isNoCorsRuleError } from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { deepSortObject } from '@odf/shared/utils';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { murmur3 } from 'murmurhash-js';
import { useNavigate } from 'react-router-dom-v5-compat';
import { KeyedMutator } from 'swr';
import { Button, ButtonVariant } from '@patternfly/react-core';

type DeleteCorsRuleModalProps = {
  mutate: KeyedMutator<GetBucketCorsCommandOutput>;
  s3Client: S3Commands;
  bucketName: string;
  ruleName: string;
  ruleHash: number;
  navigateToListPage: boolean;
};

const getUpdatedCorsRules = (
  latestRules: GetBucketCorsCommandOutput,
  ruleName: string,
  ruleHash: number
) => {
  let filteredRules: CORSRule[];
  if (!!ruleName) {
    filteredRules =
      latestRules?.CORSRules?.filter((rule) => rule.ID !== ruleName) || [];
  } else if (!!ruleHash) {
    // fallback if rule name (ID) is missing
    filteredRules =
      latestRules?.CORSRules?.filter(
        (rule) => murmur3(JSON.stringify(deepSortObject(rule))) !== ruleHash
      ) || [];
  } else {
    filteredRules = latestRules?.CORSRules || [];
  }

  return filteredRules;
};

const DeleteCorsRuleModal: React.FC<
  CommonModalProps<DeleteCorsRuleModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: {
    s3Client,
    bucketName,
    mutate,
    ruleName,
    ruleHash,
    navigateToListPage,
  },
}) => {
  const { t } = useCustomTranslation();

  const navigate = useNavigate();

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const providerType = s3Client.providerType as S3ProviderType;

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);

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

      // `{ CORSConfiguration: { CORSRules: [] } }` syntax is being interpreted as an attempt to update CORS config (not delete) with an invalid payload (no rules),
      // so the endpoint is throwing a 500 error.
      // Hence using "deleteBucketCors" for such cases where we need to cleanup entire CORS configuration.
      const updatedCorsRules = getUpdatedCorsRules(
        latestRules,
        ruleName,
        ruleHash
      );
      if (!!updatedCorsRules?.length)
        await s3Client.putBucketCors({
          Bucket: bucketName,
          CORSConfiguration: {
            CORSRules: updatedCorsRules,
          },
        });
      else await s3Client.deleteBucketCors({ Bucket: bucketName });

      setInProgress(false);
      mutate();
      closeModal();
      navigateToListPage &&
        navigate(
          `${getBucketOverviewBaseRoute(bucketName, providerType)}/permissions/cors`
        );
    } catch (err) {
      setInProgress(false);
      setError(err);
    }
  };

  return (
    <Modal
      title={t('Delete CORS rule?')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || JSON.stringify(error)}
        >
          <span>
            <Button
              variant={ButtonVariant.danger}
              onClick={onDelete}
              isDisabled={!!error || inProgress}
              className="pf-v6-u-mr-xs"
            >
              {t('Delete')}
            </Button>
            <Button
              variant={ButtonVariant.link}
              onClick={closeModal}
              className="pf-v6-u-ml-xs"
            >
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      {' '}
    </Modal>
  );
};

export default DeleteCorsRuleModal;
