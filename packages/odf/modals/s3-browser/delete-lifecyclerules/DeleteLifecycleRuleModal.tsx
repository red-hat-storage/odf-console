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
import { murmur3 } from 'murmurhash-js';
import { KeyedMutator } from 'swr';
import {
  Modal,
  ModalVariant,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';

type DeleteLifecycleRuleModalProps = {
  mutate: KeyedMutator<GetBucketLifecycleConfigurationCommandOutput>;
  noobaaS3: S3Commands;
  bucketName: string;
  ruleName: string;
  ruleHash: number;
};

const getUpdateRules = (
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
  extraProps: { noobaaS3, bucketName, mutate, ruleName, ruleHash },
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
        latestRules = await noobaaS3.getBucketLifecycleConfiguration({
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

      await noobaaS3.putBucketLifecycleConfiguration({
        Bucket: bucketName,
        LifecycleConfiguration: {
          Rules: getUpdateRules(latestRules, ruleName, ruleHash),
        },
      });

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
              className="pf-v5-u-mr-xs"
            >
              {t('Delete')}
            </Button>
            <Button
              variant={ButtonVariant.link}
              onClick={closeModal}
              className="pf-v5-u-ml-xs"
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
