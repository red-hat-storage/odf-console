import * as React from 'react';
import {
  BucketVersioningStatus,
  ObjectLockEnabled,
  PutBucketTaggingCommandInput,
} from '@aws-sdk/client-s3';
import { S3Context } from '@odf/core/components/s3-browser/s3-context';
import { useS3BucketFormValidation } from '@odf/core/components/s3-common/hooks/useS3BucketFormValidation';
import { getBucketOverviewBaseRoute } from '@odf/core/constants';
import { S3ProviderType } from '@odf/core/types';
import {
  ButtonBar,
  formSettings,
  TextInputWithFieldRequirements,
  useCustomTranslation,
  useYupValidationResolver,
} from '@odf/shared';
import { LazyNameValueEditor } from '@odf/shared/utils/NameValueEditor';
import cn from 'classnames';
import * as _ from 'lodash-es';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import {
  ActionGroup,
  Alert,
  AlertVariant,
  Button,
  ButtonType,
  ButtonVariant,
  Content,
  ContentVariants,
  Divider,
  Form,
  FormGroup,
  Level,
  LevelItem,
  Switch,
} from '@patternfly/react-core';
import { TagIcon } from '@patternfly/react-icons';
import './create-bucket-form.scss';

type FormData = {
  bucketName: string;
};

const CreateBucketForm: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [inProgress, setInProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [tagsData, setTagsData] = React.useState<string[][]>([]);
  const [isVersioningEnabled, setIsVersioningEnabled] = React.useState(false);
  const [isObjectLockEnabled, setIsObjectLockEnabled] = React.useState(false);

  const { s3Client } = React.useContext(S3Context);
  const providerType = s3Client.providerType as S3ProviderType;
  const { bucketFormSchema, fieldRequirements } = useS3BucketFormValidation();
  const resolver = useYupValidationResolver(bucketFormSchema);

  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitted },
  } = useForm({
    ...formSettings,
    resolver,
  });

  const onChangeObjectLock = (
    _event: React.FormEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    setIsObjectLockEnabled(checked);
    if (checked) {
      setIsVersioningEnabled(true);
    }
  };

  const save = async (formData: FormData) => {
    setInProgress(true);
    setErrorMessage('');
    const { bucketName } = formData;
    try {
      await s3Client.createBucket({ Bucket: bucketName });
    } catch ({ name, message }) {
      setErrorMessage(`Error while creating bucket: ${name}: ${message}`);
      setInProgress(false);
      return;
    }

    // Update bucket tags: any error here shouldn't prevent redirection
    // as the bucket has been created successfully.
    try {
      const tagSet: PutBucketTaggingCommandInput['Tagging']['TagSet'] = tagsData
        .filter((pair: string[]) => !_.isEmpty(pair[0]))
        .map((pair: string[]) => ({ Key: pair[0], Value: pair[1] }));
      if (!_.isEmpty(tagSet)) {
        await s3Client.putBucketTags({
          Bucket: bucketName,
          Tagging: { TagSet: tagSet },
        });
      }
    } catch ({ name, message }) {
      // @TODO: add a toast warning that is visible after redirection to bucket details.
      // eslint-disable-next-line no-console
      console.error(`Error while updating bucket tags: ${name}: ${message}`);
    }
    // Object Lock can only be applied once versioning is enabled on the
    // bucket, so versioning must be set up first (not as a mutually
    // exclusive branch) whenever either toggle is on.
    if (isVersioningEnabled) {
      try {
        await s3Client.putBucketVersioning({
          Bucket: bucketName,
          VersioningConfiguration: {
            Status: BucketVersioningStatus.Enabled,
          },
        });
      } catch ({ name, message }) {
        // @TODO: add a toast warning that is visible after redirection to bucket details.
        // eslint-disable-next-line no-console
        console.error(
          `Error while updating bucket versioning: ${name}: ${message}`
        );
      }
    }
    if (isObjectLockEnabled) {
      try {
        await s3Client.putObjectLockConfiguration({
          Bucket: bucketName,
          ObjectLockConfiguration: {
            ObjectLockEnabled: ObjectLockEnabled.Enabled,
          },
        });
      } catch ({ name, message }) {
        // @TODO: add a toast warning that is visible after redirection to bucket details.
        // eslint-disable-next-line no-console
        console.error(
          `Error while updating bucket object lock configuration: ${name}: ${message}`
        );
      }
    }
    navigate(`${getBucketOverviewBaseRoute(bucketName, providerType)}`);
  };

  return (
    <Form onSubmit={handleSubmit(save)} className="pf-v6-u-w-50">
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements}
        popoverProps={{
          headerContent: t('Name requirements'),
          footerContent: `${t('Example')}: my-bucket`,
        }}
        formGroupProps={{
          label: t('Bucket Name'),
          fieldId: 'bucket-name',
          isRequired: true,
          className: 'control-label',
        }}
        textInputProps={{
          id: 'bucket-name',
          name: 'bucketName',
          className: 'pf-v6-c-form-control',
          type: 'text',
          placeholder: t('my-bucket'),
          'aria-describedby': 'bucket-name-help',
          'data-test': 'bucket-name',
        }}
        helperText={t('A unique name for your bucket.')}
      />
      <FormGroup
        label={t('Tags')}
        labelInfo={t('Use different criteria for tagging your bucket.')}
        className={cn('odf-create-s3-bucket-form__tags', {
          'odf-create-s3-bucket-form__tags--empty': _.isEmpty(tagsData),
        })}
      >
        {_.isEmpty(tagsData) && (
          <div className="pf-v6-u-disabled-color-100 pf-v6-u-mr-sm">
            {t('No tags are attached to this bucket.')}
          </div>
        )}
        <LazyNameValueEditor
          className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm"
          addString={t('Add tag')}
          valueString={t('Value (optional)')}
          nameValuePairs={tagsData}
          updateParentData={({ nameValuePairs }) => {
            setTagsData(nameValuePairs);
          }}
          hideHeaderWhenNoItems={true}
          IconComponent={TagIcon}
          nameMaxLength={128}
          valueMaxLength={256}
        />
      </FormGroup>
      <Divider className="pf-v6-u-mb-md" />
      <Content className="pf-v6-u-mb-md">
        <Content component={ContentVariants.h2}>
          {t('Bucket properties')}
        </Content>
        <Content component={ContentVariants.small}>
          {t(
            'Customize and manage the behaviour and attributes of a storage bucket, including options like versioning, access control, and retention policies.'
          )}
        </Content>
      </Content>
      <Level className="pf-v6-u-mb-md pf-v6-u-flex-nowrap">
        <LevelItem className="pf-v6-u-flex-1">
          <Content>
            <Content component={ContentVariants.h4}>{t('Versioning')}</Content>
            <Content component={ContentVariants.small}>
              {t(
                'Enables the retention of multiple versions of an object in a bucket, allowing for recovery and tracking of changes over time.'
              )}
            </Content>
          </Content>
        </LevelItem>
        <LevelItem className="pf-v6-u-flex-shrink-0">
          <Switch
            id="versioning-switch"
            isChecked={isVersioningEnabled}
            isDisabled={isObjectLockEnabled}
            onChange={(_event, checked) => setIsVersioningEnabled(checked)}
          />
        </LevelItem>
      </Level>
      <Level className="pf-v6-u-mb-md pf-v6-u-flex-nowrap">
        <LevelItem className="pf-v6-u-flex-1">
          <Content>
            <Content component={ContentVariants.h4}>{t('Object Lock')}</Content>
            <Content component={ContentVariants.small}>
              {t(
                'Prevents objects in a bucket from being deleted or overwritten for a specified retention period, ensuring data immutability and compliance. Object Lock works only in versioned buckets. Enabling Object Lock automatically enables bucket versioning.'
              )}
            </Content>
          </Content>
        </LevelItem>
        <LevelItem className="pf-v6-u-flex-shrink-0">
          <Switch
            id="object-lock-switch"
            isChecked={isObjectLockEnabled}
            onChange={onChangeObjectLock}
          />
        </LevelItem>
      </Level>
      {!isValid && isSubmitted && (
        <Alert
          variant={AlertVariant.danger}
          isInline
          title={t('Address form errors to proceed')}
        />
      )}
      <ButtonBar errorMessage={errorMessage} inProgress={inProgress}>
        <ActionGroup className="pf-v6-c-form">
          <Button
            id="create-s3-bucket-btn"
            type={ButtonType.submit}
            variant={ButtonVariant.primary}
            data-test="obc-create"
          >
            {t('Create')}
          </Button>
          <Button
            onClick={() => navigate(-1)}
            type={ButtonType.button}
            variant={ButtonVariant.secondary}
          >
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </ButtonBar>
    </Form>
  );
};

export default CreateBucketForm;
