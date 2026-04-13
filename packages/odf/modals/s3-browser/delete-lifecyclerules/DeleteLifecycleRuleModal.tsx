import * as React from 'react';
import {
  LifecycleRule,
  GetBucketLifecycleConfigurationCommandOutput,
} from '@aws-sdk/client-s3';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { isNoLifecycleRuleError } from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { deepSortObject } from '@odf/shared/utils';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { murmur3 } from 'murmurhash-js';
import { KeyedMutator } from 'swr';
import { Button, ButtonVariant } from '@patternfly/react-core';

type DeleteLifecycleRuleModalProps = {
  mutate: KeyedMutator<GetBucketLifecycleConfigurationCommandOutput>;
  s3Client: S3Commands;
  bucketName: string;
  ruleName: string;
  ruleHash: number;
};

const getUpdatedRules = (
  latestRules: GetBucketLifecycleConfigurationCommandOutput,
  ruleName: string,
  ruleHash: number
) => {
  let filteredRules: LifecycleRule[];
  if (!!ruleName) {
    filteredRules =
      latestRules?.Rules?.filter((rule) => rule.ID !== ruleName) || [];
  } else if (!!ruleHash) {
    // fallback if rule name (ID) is missing
    filteredRules =
      latestRules?.Rules?.filter(
        (rule) => murmur3(JSON.stringify(deepSortObject(rule))) !== ruleHash
      ) || [];
  } else {
    filteredRules = latestRules?.Rules || [];
  }

  return filteredRules;
};

const DeleteLifecycleRuleModal: React.FC<
  CommonModalProps<DeleteLifecycleRuleModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { s3Client, bucketName, mutate, ruleName, ruleHash },
}) => {
  const { t } = useCustomTranslation();

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      let latestRules: GetBucketLifecycleConfigurationCommandOutput;

      try {
        latestRules = await s3Client.getBucketLifecycleConfiguration({
          Bucket: bucketName,
        });
      } catch (err) {
        if (isNoLifecycleRuleError(err)) {
          latestRules = {
            Rules: [],
          } as GetBucketLifecycleConfigurationCommandOutput;
        } else {
          throw err;
        }
      }

      // `{ LifecycleConfiguration: { Rules: [] } }` syntax is being interpreted as an attempt to update Lifecycle config (not delete) with an invalid payload (no rules),
      // so the endpoint is throwing a 500 error.
      // Hence using "deleteBucketLifecycle" for such cases where we need to cleanup entire Lifecycle configuration.
      const updatedLifecycleRules = getUpdatedRules(
        latestRules,
        ruleName,
        ruleHash
      );
      if (!!updatedLifecycleRules?.length)
        await s3Client.putBucketLifecycleConfiguration({
          Bucket: bucketName,
          LifecycleConfiguration: {
            Rules: updatedLifecycleRules,
          },
        });
      else await s3Client.deleteBucketLifecycle({ Bucket: bucketName });

      setInProgress(false);
      mutate();
      closeModal();
    } catch (err) {
      setInProgress(false);
      setError(err);
    }
  };

  return (
    <Modal
      title={t('Delete lifecycle rule?')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      description={
        <div className="text-muted">
          {t(
            'Deleting this lifecycle rule may prevent the removal of existing objects, potentially increasing storage costs.'
          )}
        </div>
      }
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

export default DeleteLifecycleRuleModal;
