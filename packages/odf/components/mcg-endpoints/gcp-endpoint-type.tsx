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
  InputGroupItem,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
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
      <Button icon={<HelpIcon />} variant="link">
        {t('Where can I find Google Cloud credentials?')}
      </Button>
    </Popover>
  );

  const onUpload = (event, setInputData) => {
    event.preventDefault();
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = _.get(ev, 'target.result') as string;
      setFileData(data);
      setInputData(file.name);
      dispatch({ type: 'setGcpJSON', value: data });
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
              <InputGroupItem isFill>
                <TextInput
                  readOnly
                  value={value}
                  className="nb-endpoints-form-entry__file-name"
                  placeholder={t('Upload JSON')}
                  aria-label={t('Uploaded File Name')}
                />
              </InputGroupItem>
              <InputGroupItem>
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
              </InputGroupItem>
              <InputGroupItem>
                <Button
                  icon={t('Switch to Secret')}
                  variant="plain"
                  onClick={toggleShowSecret}
                  aria-label={t('Switch to Secret')}
                />
              </InputGroupItem>
            </InputGroup>
          ) : (
            <InputGroup>
              <InputGroupItem>
                <ResourceDropdown<K8sResourceCommon>
                  className="nb-endpoints-form-entry__dropdown nb-endpoints-form-entry__dropdown--full-width"
                  onSelect={(e) => {
                    onChange(e.metadata.name);
                    dispatch({ type: 'setSecretName', value: e.metadata.name });
                  }}
                  resourceModel={SecretModel}
                  resource={{
                    namespace,
                    kind: SecretModel.kind,
                    isList: true,
                  }}
                />
              </InputGroupItem>
              <InputGroupItem>
                <Button
                  icon={t('Switch to upload JSON')}
                  variant="plain"
                  onClick={toggleShowSecret}
                  aria-label={t('Switch to upload JSON')}
                />
              </InputGroupItem>
            </InputGroup>
          )
        }
      />
      {!showSecret && (
        <FormGroup className="nb-endpoints-form-entry" fieldId="gcp-data">
          <TextArea
            aria-label={t('Cluster Metadata')}
            className="nb-endpoints-form-entry__data-dump"
            value={fileData}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{gcpHelpText}</HelperTextItem>
            </HelperText>
          </FormHelperText>
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
            onChange={(_event, val) => {
              onChange(val);
              dispatch({ type: 'setTarget', value: val });
            }}
            onBlur={onBlur}
            aria-label={t('Target Bucket')}
          />
        )}
      />
    </>
  );
};
