import * as React from 'react';
import { CORSRule, GetBucketCorsCommandOutput } from '@aws-sdk/client-s3';
import { BUCKETS_BASE_ROUTE } from '@odf/core/constants';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { isNoCorsRuleError } from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { deepSortObject } from '@odf/shared/utils';
import { murmur3 } from 'murmurhash-js';
import { useNavigate } from 'react-router-dom-v5-compat';
import { KeyedMutator } from 'swr';
import {
  Modal,
  ModalVariant,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';

type DeleteCorsRuleModalProps = {
  mutate: KeyedMutator<GetBucketCorsCommandOutput>;
  noobaaS3: S3Commands;
  bucketName: string;
  ruleName: string;
  ruleHash: number;
  navigateToListPage: boolean;
};

const getUpdateCorsRules = (
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
    noobaaS3,
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

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      let latestRules: GetBucketCorsCommandOutput;

      try {
        latestRules = await noobaaS3.getBucketCors({ Bucket: bucketName });
      } catch (err) {
        if (isNoCorsRuleError(err)) {
          latestRules = { CORSRules: [] } as GetBucketCorsCommandOutput;
        } else {
          throw err;
        }
      }

      await noobaaS3.putBucketCors({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: getUpdateCorsRules(latestRules, ruleName, ruleHash),
        },
      });

      setInProgress(false);
      mutate();
      closeModal();
      navigateToListPage &&
        navigate(`${BUCKETS_BASE_ROUTE}/${bucketName}/permissions/cors`);
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

export default DeleteCorsRuleModal;
