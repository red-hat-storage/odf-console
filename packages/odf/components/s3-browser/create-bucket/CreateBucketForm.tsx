import * as React from 'react';
import { PutBucketTaggingCommandInput } from '@aws-sdk/client-s3';
import useS3BucketFormValidation from '@odf/core/components/s3-browser/create-bucket/useS3BucketFormValidation';
import { S3Context } from '@odf/core/components/s3-browser/s3-context';
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
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  ActionGroup,
  Alert,
  AlertVariant,
  Button,
  ButtonType,
  ButtonVariant,
  Form,
  FormGroup,
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
