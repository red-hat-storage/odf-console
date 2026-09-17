import * as React from 'react';
import { getObjectVersionId } from '@odf/core/utils';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import {
  Button,
  ButtonVariant,
  Alert,
  AlertVariant,
  TextInput,
  TextInputTypes,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ObjectCrFormat } from '../../../types';

// Minimum number of days a restored copy can be kept (S3 rule: Days >= 1).
const MIN_RESTORE_DAYS = 1;
// Default the input to the minimum; users can increase it as needed.
const DEFAULT_RESTORE_DAYS = 1;

type RestoreObjectModalProps = {
  bucketName: string;
  object: ObjectCrFormat;
  s3Client: S3Commands;
  showVersioning: boolean;
  // refreshes the objects list so the restore status ("Restoring…") shows up.
  refreshTokens: () => Promise<void>;
};

// A restore request only fails fast (before the async restore begins) for
// client-side reasons. These acknowledgements mean "restore is now underway"
// and we should close the modal and refresh the list.
const isRestoreAcknowledged = (err: any): boolean =>
  // Restore already running for this object -> treat as success.
  err?.name === 'RestoreAlreadyInProgress';

const RestoreObjectModal: React.FC<
  CommonModalProps<RestoreObjectModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { bucketName, object, s3Client, showVersioning, refreshTokens },
}) => {
  const { t } = useCustomTranslation();

  const [days, setDays] = React.useState<number>(DEFAULT_RESTORE_DAYS);
  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const objectKey = getName(object);
  const versionId = getObjectVersionId(object);
  const isValid = Number.isInteger(days) && days >= MIN_RESTORE_DAYS;

  const onRestore = async (event) => {
    event.preventDefault();
    setInProgress(true);
    setError(undefined);

    try {
      await s3Client.restoreObject({
        Bucket: bucketName,
        Key: objectKey,
        ...(showVersioning && !!versionId && { VersionId: versionId }),
        RestoreRequest: { Days: days },
      });
      // Acknowledgement received (202 initiated / 200 already restored). The
      // actual restore runs asynchronously server-side (can take hours), so we
      // do NOT keep the modal open. Refresh the list to reflect the new status.
      await refreshTokens();
      closeModal();
    } catch (err) {
      if (isRestoreAcknowledged(err)) {
        await refreshTokens();
        closeModal();
        return;
      }
      setInProgress(false);
      setError(err);
    }
  };

  return (
    <Modal
      title={t('Restore object')}
      isOpen={isOpen}
      onClose={closeModal}
      description={
        <div className="text-muted">
          {t(
            'This object is stored in Deep Archive and must be restored before it can be downloaded or previewed. Restoring creates a temporary copy that is available for the number of days you specify. Restoration runs in the background and can take several hours to complete.'
          )}
        </div>
      }
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || (error && JSON.stringify(error))}
        >
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={onRestore}
              isDisabled={!isValid || inProgress}
              className="pf-v6-u-mr-xs"
            >
              {t('Restore')}
            </Button>
            <Button
              variant={ButtonVariant.secondary}
              onClick={closeModal}
              className="pf-v6-u-ml-xs"
            >
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <FormGroup
        label={t('Number of days to keep the restored copy')}
        fieldId="restore-days"
        isRequired
      >
        <TextInput
          value={days}
          id="restore-days"
          type={TextInputTypes.number}
          min={MIN_RESTORE_DAYS}
          onChange={(_event, value) => setDays(Number(value))}
          isRequired
          validated={
            isValid ? ValidatedOptions.default : ValidatedOptions.error
          }
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem
              variant={
                isValid ? ValidatedOptions.default : ValidatedOptions.error
              }
            >
              {isValid
                ? t(
                    'The restored copy is kept for this many days, then automatically removed. Your storage administrator may cap the maximum number of days allowed.'
                  )
                : t('Enter a whole number of days (minimum {{min}}).', {
                    min: MIN_RESTORE_DAYS,
                  })}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <Alert
        variant={AlertVariant.info}
        className="pf-v6-u-mt-sm"
        isInline
        title={t(
          'Restoration continues in the background after this dialog closes. The object status updates to show restore progress.'
        )}
      />
    </Modal>
  );
};

export default RestoreObjectModal;
