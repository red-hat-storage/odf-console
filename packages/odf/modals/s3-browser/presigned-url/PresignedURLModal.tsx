import * as React from 'react';
import { getObjectVersionId } from '@odf/core/utils';
import StaticDropdown from '@odf/shared/dropdown/StaticDropdown';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { numberInputOnChange } from '@odf/shared/utils';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { DateTime } from 'luxon';
import {
  Button,
  ButtonVariant,
  Alert,
  AlertVariant,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
  NumberInput,
  ClipboardCopy,
} from '@patternfly/react-core';
import { ObjectCrFormat } from '../../../types';
import './presigned-modal.scss';

// using same "key" and "value" in the enum on purpose, due to how "StaticDropdown" is implemented
enum TimeUnits {
  Hours = 'Hours',
  Minutes = 'Minutes',
}

type PresignedURLModalProps = {
  bucketName: string;
  object: ObjectCrFormat;
  s3Client: S3Commands;
  showVersioning: boolean;
};

type URLExpiration = {
  value: number;
  unit: TimeUnits;
};

type URLDetails = {
  url: string;
  validUntil: string;
};

type ExpirationInputProps = {
  urlExpiration: URLExpiration;
  setURLExpiration: React.Dispatch<React.SetStateAction<URLExpiration>>;
};

type CopyURLProps = {
  urlDetails: React.MutableRefObject<URLDetails>;
};

const ExpirationInput: React.FC<ExpirationInputProps> = ({
  urlExpiration,
  setURLExpiration,
}) => {
  const { t } = useCustomTranslation();

  const inputValue = urlExpiration.value;
  const minValue = 1;
  const maxValue = urlExpiration.unit === TimeUnits.Minutes ? 720 : 12;

  const onInputChange = (value: number) =>
    setURLExpiration({ ...urlExpiration, value });
  const onUnitChange = (unit: TimeUnits) =>
    setURLExpiration({ value: minValue, unit });

  return (
    <FormGroup label={t('Expires after')} fieldId="expires-after">
      <NumberInput
        id="expires-after"
        aria-label={t('Expires after')}
        minusBtnAriaLabel={t('minus')}
        plusBtnAriaLabel={t('plus')}
        value={inputValue}
        min={minValue}
        max={maxValue}
        onChange={numberInputOnChange(minValue, maxValue, onInputChange)}
        onMinus={(): void => onInputChange(inputValue - 1)}
        onPlus={(): void => onInputChange(inputValue + 1)}
        className="pf-v6-u-mr-xs"
      />
      <StaticDropdown
        defaultSelection={TimeUnits.Minutes}
        dropdownItems={TimeUnits}
        onSelect={onUnitChange}
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant={ValidatedOptions.default}>
            {t('Validity period of the presigned URL.')}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

const CopyURL: React.FC<CopyURLProps> = ({ urlDetails }) => {
  const { t } = useCustomTranslation();

  return (
    <FormGroup label={t('Share link')} fieldId="share-link">
      <div className="pf-v6-u-text-align-right text-muted">
        <b>{t('Valid until: ')}</b>
        {urlDetails.current.validUntil}{' '}
      </div>
      <ClipboardCopy isReadOnly hoverTip={t('Copy')} clickTip={t('Copied')}>
        {urlDetails.current.url}
      </ClipboardCopy>
      <Alert
        variant={AlertVariant.info}
        className="pf-v6-u-mt-sm"
        isInline
        isPlain
        title={t(
          'This URL will automatically expire based on your configured time or when your current session expires.'
        )}
      />
    </FormGroup>
  );
};

const PresignedURLModal: React.FC<CommonModalProps<PresignedURLModalProps>> = ({
  closeModal,
  isOpen,
  extraProps: { bucketName, object, s3Client, showVersioning },
}) => {
  const { t } = useCustomTranslation();

  const urlDetails = React.useRef<URLDetails>({ url: null, validUntil: null });
  const [urlExpiration, setURLExpiration] = React.useState<URLExpiration>({
    value: 1,
    unit: TimeUnits.Minutes,
  });
  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const objectName = getName(object);
  const urlCreated = !!urlDetails.current.url;

  const onCopy = () => {
    navigator.clipboard.writeText(urlDetails.current.url);
  };

  const onCreate = (event) => {
    event.preventDefault();
    setInProgress(true);

    // in seconds
    const expiresIn =
      urlExpiration.value *
      (urlExpiration.unit === TimeUnits.Minutes ? 60 : 3600);

    s3Client
      .getSignedUrl(
        {
          Bucket: bucketName,
          Key: objectName,
          ...(showVersioning && { VersionId: getObjectVersionId(object) }),
        },
        expiresIn
      )
      .then((url) => {
        urlDetails.current.url = url;
        urlDetails.current.validUntil = DateTime.now()
          .plus({ seconds: expiresIn })
          .toLocaleString(DateTime.DATETIME_FULL);
        setInProgress(false);
      })
      .catch((err) => {
        setError(err);
        setInProgress(false);
      });
  };

  return (
    <Modal
      title={t('Share object with a presigned URL')}
      isOpen={isOpen}
      onClose={closeModal}
      description={
        <div className="text-muted">
          {t('Grant third-party access to an object for a limited time.')}
        </div>
      }
      variant={ModalVariant.medium}
      className="object-presigned-url--height"
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || JSON.stringify(error)}
        >
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={urlCreated ? onCopy : onCreate}
              isDisabled={!!error}
            >
              {urlCreated
                ? t('Copy presigned URL to clipboard')
                : t('Create presigned URL')}
            </Button>
            <Button variant={ButtonVariant.link} onClick={closeModal}>
              {urlCreated ? t('Close') : t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <div className="text-muted">
        <b>{t('Object: ')}</b>
        {objectName}
      </div>
      <Alert
        variant={AlertVariant.info}
        className="pf-v6-u-mt-sm pf-v6-u-mb-sm"
        isInline
        title={t(
          'A third-party entity can access the object using this presigned URL, which allows sharing without requiring a login, until the URL expires.'
        )}
      />
      {!error &&
        (urlCreated ? (
          <CopyURL urlDetails={urlDetails} />
        ) : (
          <ExpirationInput
            urlExpiration={urlExpiration}
            setURLExpiration={setURLExpiration}
          />
        ))}
    </Modal>
  );
};

export default PresignedURLModal;
