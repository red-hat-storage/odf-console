import * as React from 'react';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { FormGroupController } from '@odf/shared/form-group-controller';
import { SecretModel } from '@odf/shared/models';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import { Control } from 'react-hook-form';
import {
  Button,
  FormGroup,
  TextInput,
  InputGroup,
  TextArea,
  PopoverPosition,
  Popover,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { createFormAction } from '../../constants';
import {
  BackingStoreAction,
  BackingStoreProviderDataState,
} from '../create-bs/reducer';
import './noobaa-provider-endpoints.scss';

type GCPEndPointTypeProps = {
  state: BackingStoreProviderDataState;
  dispatch: React.Dispatch<BackingStoreAction>;
  namespace: string;
  control: Control;
};

type ExternalLinkProps = {
  href: string;
  text?: React.ReactNode;
  additionalClassName?: string;
  dataTestID?: string;
  stopPropagation?: boolean;
};

export const ExternalLink: React.FC<ExternalLinkProps> = ({
  children,
  href,
  text,
  additionalClassName = '',
  dataTestID,
  stopPropagation,
}) => (
  <a
    className={classNames('co-external-link', additionalClassName)}
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    data-test-id={dataTestID}
    {...(stopPropagation ? { onClick: (e) => e.stopPropagation() } : {})}
  >
    {children || text}
  </a>
);

export const GCPEndpointType: React.FC<GCPEndPointTypeProps> = (props) => {
  const { t } = useCustomTranslation();

  const [fileData, setFileData] = React.useState('');
  const [showSecret, setShowSecret] = React.useState(false);
  const { dispatch, namespace, control } = props;

  const toggleShowSecret = () => setShowSecret((isShown) => !isShown);

  const gcpHelpText = (
    <Popover
      position={PopoverPosition.top}
      headerContent=" "
      bodyContent={
        <div>
          {t(
            'Service account keys are needed for Google Cloud Storage authentication. The keys can be found in the service accounts page in the GCP console.'
          )}
          <ExternalLink
            href="https://cloud.google.com/iam/docs/service-accounts#service_account_keys"
            text={t('Learn more')}
          />
        </div>
      }
      enableFlip
      maxWidth="21rem"
    >
      <Button variant="link">
        <HelpIcon />
        {t('Where can I find Google Cloud credentials?')}
      </Button>
    </Popover>
  );

  const onUpload = (event, setInputData) => {
    event.preventDefault();
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = _.get(ev, 'target.result');
      setFileData(data);
      setInputData(file.name);
      dispatch({ type: createFormAction.SET_GCP_JSON, value: data });
    };
    reader.readAsText(file);
  };

  return (
    <>
      <FormGroupController
        name="secret-key"
        control={control}
        formGroupProps={{
          className: 'nb-endpoints-form-entry',
          helperText: !showSecret
            ? t(
                'Upload a .json file with the service account keys provided by Google Cloud Storage.'
              )
            : null,
          label: t('Secret Key'),
          fieldId: 'secret-key',
          isRequired: true,
        }}
        render={({ value, onChange, onBlur }) =>
          !showSecret ? (
            <InputGroup>
              <TextInput
                readOnly
                value={value}
                className="nb-endpoints-form-entry__file-name"
                placeholder={t('Upload JSON')}
                aria-label={t('Uploaded File Name')}
              />
              <div className="inputbtn nb-endpoints-form-entry-upload-btn">
                <Button
                  href="#"
                  variant="secondary"
                  className="custom-input-btn nb-endpoints-form-entry-upload-btn__button"
                  aria-label={t('Upload File')}
                >
                  {t('Browse')}
                </Button>
                <input
                  type="file"
                  id="inputButton"
                  className="nb-endpoints-form-entry-upload-btn__input"
                  onChange={(ev) => onUpload(ev, onChange)}
                  onBlur={onBlur}
                  aria-label={t('Upload File')}
                />
              </div>
              <Button
                variant="plain"
                onClick={toggleShowSecret}
                aria-label={t('Switch to Secret')}
              >
                {t('Switch to Secret')}
              </Button>
            </InputGroup>
          ) : (
            <InputGroup>
              <ResourceDropdown<K8sResourceCommon>
                className="nb-endpoints-form-entry__dropdown nb-endpoints-form-entry__dropdown--full-width"
                onSelect={(e) => {
                  onChange(e.metadata.name);
                  dispatch({
                    type: createFormAction.SET_SECRET_NAME,
                    value: e.metadata.name,
                  });
                }}
                resourceModel={SecretModel}
                resource={{
                  namespace,
                  kind: SecretModel.kind,
                  isList: true,
                }}
              />
              <Button
                variant="plain"
                onClick={toggleShowSecret}
                aria-label={t('Switch to upload JSON')}
              >
                {t('Switch to upload JSON')}
              </Button>
            </InputGroup>
          )
        }
      />
      {!showSecret && (
        <FormGroup
          className="nb-endpoints-form-entry"
          helperText={gcpHelpText}
          fieldId="gcp-data"
        >
          <TextArea
            aria-label={t('Cluster Metadata')}
            className="nb-endpoints-form-entry__data-dump"
            value={fileData}
          />
        </FormGroup>
      )}
      <FormGroupController
        name="target-bucket"
        control={control}
        formGroupProps={{
          className: 'nb-endpoints-form-entry',
          label: t('Target Bucket'),
          fieldId: 'target-bucket',
          isRequired: true,
        }}
        render={({ value, onChange, onBlur }) => (
          <TextInput
            value={value}
            onChange={(e) => {
              onChange(e);
              dispatch({ type: createFormAction.SET_TARGET, value: e });
            }}
            onBlur={onBlur}
            aria-label={t('Target Bucket')}
          />
        )}
      />
    </>
  );
};
