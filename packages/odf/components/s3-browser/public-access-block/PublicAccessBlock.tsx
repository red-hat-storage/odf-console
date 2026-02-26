import * as React from 'react';
import {
  GetPublicAccessBlockCommandOutput,
  GetBucketPolicyStatusCommandOutput,
} from '@aws-sdk/client-s3';
import { S3Context } from '@odf/core/components/s3-browser/s3-context';
import { CheckboxTree } from '@odf/shared/checkbox-tree';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { StatusBox, LoadingBox } from '@odf/shared/generic/status-box';
import { S3Commands } from '@odf/shared/s3';
import { isNoPabError } from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  ListPageBody,
  ListPageHeader,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { useParams } from 'react-router-dom-v5-compat';
import useSWRMutation from 'swr/mutation';
import {
  Button,
  ButtonVariant,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import {
  BUCKET_POLICY_STATUS_CACHE_KEY_SUFFIX,
  BUCKET_PUBLIC_ACCESS_BLOCK_CACHE_KEY_SUFFIX,
} from '../../../constants';
import PublicAccessBlockConfirmation from '../../../modals/s3-browser/public-access-block-confirmation/PublicAccessBlockConfirmation';
import {
  SupportedConfig,
  getOptions,
  areAllChildrenChecked,
  isNoChildChecked,
  showModal,
} from './utils';

type PabOutput = GetPublicAccessBlockCommandOutput;

type PublicAccessBlockProps = {
  obj: { fresh?: boolean; triggerRefresh: () => void };
};

type PabAlertProps = {
  checkedItems: Set<string>;
  policyStatusData: GetBucketPolicyStatusCommandOutput;
};

type PabBodyProps = {
  checkedItems: Set<string>;
  setCheckedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  manage: boolean;
};

type PabFooterProps = {
  checkedItems: Set<string>;
  triggerRefresh: () => void;
  bucketName: string;
  s3Client: S3Commands;
  pabData: PabOutput;
};

const PabAlert: React.FC<PabAlertProps> = ({
  checkedItems,
  policyStatusData,
}) => {
  const { t } = useCustomTranslation();

  const isPublicPolicy: boolean =
    (policyStatusData ?? {})?.PolicyStatus?.IsPublic || false;
  const allChecked = areAllChildrenChecked(checkedItems);
  const noChecked = isNoChildChecked(checkedItems);

  if (isPublicPolicy && noChecked) {
    return (
      <Alert
        variant={AlertVariant.danger}
        title={t('Your bucket is currently publicly accessible.')}
        className="pf-v6-u-mb-sm"
      >
        <p>
          {t(
            'The current bucket policy and object permissions allow public access. This may unintentionally expose your data to users outside your organization and increase the risk of data leaks or unauthorized actions.'
          )}
        </p>
      </Alert>
    );
  }

  if (!allChecked) {
    return (
      <Alert
        variant={AlertVariant.warning}
        title={t(
          'One or more settings might have allowed public access to your bucket'
        )}
        className="pf-v6-u-mb-sm"
      />
    );
  }

  return null;
};

const PabBody: React.FC<PabBodyProps> = ({
  checkedItems,
  setCheckedItems,
  manage,
}) => {
  const { t } = useCustomTranslation();

  return (
    <CheckboxTree
      checkedItems={checkedItems}
      setCheckedItems={setCheckedItems}
      options={getOptions(manage, checkedItems, t)}
      treeViewProps={{ hasGuides: true }}
    />
  );
};

const PabFooter: React.FC<PabFooterProps> = ({
  checkedItems,
  triggerRefresh,
  bucketName,
  s3Client,
  pabData,
}) => {
  const { t } = useCustomTranslation();

  const launcher = useModal();

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const handleSubmit = (event) => {
    event.preventDefault();
    setInProgress(true);

    const publicAccessBlockConfiguration = {};
    Object.entries(SupportedConfig).forEach(([key, value]) => {
      publicAccessBlockConfiguration[key] = checkedItems.has(value);
    });

    s3Client
      .putPublicAccessBlock({
        Bucket: bucketName,
        PublicAccessBlockConfiguration: publicAccessBlockConfiguration,
      })
      .then(() => {
        triggerRefresh();
        setInProgress(false);
      })
      .catch((err) => {
        setError(err);
        setInProgress(false);
      });
  };

  // show this modal only when disabling a configuration that is currently enabled. Otherwise, do not show it
  const [shouldShowModal, configText] = showModal(pabData, checkedItems, t);
  const launchConfirmationModal = () =>
    launcher(PublicAccessBlockConfirmation, {
      extraProps: { onDisable: handleSubmit, configText },
      isOpen: true,
    });

  return (
    <ButtonBar
      inProgress={inProgress}
      errorMessage={error?.message || JSON.stringify(error)}
      className="pf-v6-u-mt-xl"
    >
      <span className="pf-v6-u-mt-sm">
        <Button
          variant={ButtonVariant.primary}
          onClick={shouldShowModal ? launchConfirmationModal : handleSubmit}
          className="pf-v6-u-mr-xs"
          isDisabled={!!error || inProgress}
        >
          {t('Save changes')}
        </Button>
        <Button
          variant={ButtonVariant.secondary}
          onClick={triggerRefresh}
          className="pf-v6-u-ml-xs"
        >
          {t('Cancel')}
        </Button>
      </span>
    </ButtonBar>
  );
};

const PublicAccessBlockContent: React.FC<PublicAccessBlockProps['obj']> = ({
  triggerRefresh,
}) => {
  const { t } = useCustomTranslation();
  const [manage, setManage] = React.useState(false);
  const [checkedItems, setCheckedItems] = React.useState(new Set<string>());
  const setItemsRef = React.useRef(true);

  const { bucketName } = useParams();
  const { s3Client } = React.useContext(S3Context);

  const { data: policyStatus, trigger: triggerPolicyStatus } = useSWRMutation(
    `${s3Client.providerType}-${bucketName}-${BUCKET_POLICY_STATUS_CACHE_KEY_SUFFIX}`,
    () => s3Client.getBucketPolicyStatus({ Bucket: bucketName })
  );
  const {
    data: pabData = {} as PabOutput,
    isMutating: isLoading,
    error,
    trigger: triggerPab,
  } = useSWRMutation(
    `${s3Client.providerType}-${bucketName}-${BUCKET_PUBLIC_ACCESS_BLOCK_CACHE_KEY_SUFFIX}`,
    () => s3Client.getPublicAccessBlock({ Bucket: bucketName })
  );

  const noPabError = isNoPabError(error);

  // initial fetch on first mount or remounts only
  React.useEffect(() => {
    triggerPolicyStatus().catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
    triggerPab().catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!_.isEmpty(pabData) && setItemsRef.current) {
      setItemsRef.current = false;
      const checked = new Set<string>();
      Object.entries(SupportedConfig).forEach(([key, value]) => {
        if (pabData?.PublicAccessBlockConfiguration?.[key] === true)
          checked.add(value);
      });
      setCheckedItems(checked);
    }
  }, [pabData, setCheckedItems]);

  if (isLoading || (error && !noPabError)) {
    return <StatusBox loaded={!isLoading} loadError={isLoading ? '' : error} />;
  }

  return (
    <>
      <ListPageHeader
        title={t('Block public access')}
        helpText={t(
          'To ensure that public access to your S3 bucket and its objects is blocked, turn on Block all public access.'
        )}
      >
        {!manage && (
          <Button
            variant={ButtonVariant.primary}
            onClick={() => setManage(true)}
          >
            {t('Manage public access settings')}
          </Button>
        )}
      </ListPageHeader>
      <ListPageBody>
        {!manage && (
          <PabAlert
            checkedItems={checkedItems}
            policyStatusData={policyStatus}
          />
        )}
        <PabBody
          checkedItems={checkedItems}
          setCheckedItems={setCheckedItems}
          manage={manage}
        />
        {manage && (
          <PabFooter
            checkedItems={checkedItems}
            triggerRefresh={triggerRefresh}
            bucketName={bucketName}
            s3Client={s3Client}
            pabData={pabData}
          />
        )}
      </ListPageBody>
    </>
  );
};

export const PublicAccessBlock: React.FC<PublicAccessBlockProps> = ({
  obj: { fresh, triggerRefresh },
}) =>
  fresh ? (
    <PublicAccessBlockContent triggerRefresh={triggerRefresh} />
  ) : (
    <LoadingBox />
  );
