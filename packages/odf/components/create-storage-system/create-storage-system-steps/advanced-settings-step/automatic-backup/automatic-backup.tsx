import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Checkbox,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  Radio,
} from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import { WizardDispatch } from '../../../reducer';

const DEFAULT_BACKUP_COPIES = 5;

enum CronTime {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

const CRON_MAP: Record<CronTime, string> = {
  [CronTime.DAILY]: '0 0 * * *', // Every day at 12:00 AM
  [CronTime.WEEKLY]: '0 0 * * 6', // Every Saturday at 12:00 AM
  [CronTime.MONTHLY]: '0 0 1-7 * 6', // First Saturday of each month at 12:00 AM
};

type AutomaticBackupProps = {
  dispatch: WizardDispatch;
  isAutomaticBackup: boolean;
};

export const AutomaticBackup: React.FC<AutomaticBackupProps> = ({
  dispatch,
  isAutomaticBackup,
}) => {
  const { t } = useCustomTranslation();
  const [backupCopies, setBackupCopies] = React.useState(DEFAULT_BACKUP_COPIES);
  const [selectedFrequency, setSelectedFrequency] = React.useState<CronTime>(
    CronTime.DAILY
  );
  const [cron, setCron] = React.useState(CRON_MAP[CronTime.DAILY]);

  const handleSelect = (type: CronTime) => {
    setSelectedFrequency(type);
    setCron(CRON_MAP[type] || '');
  };

  const onBackupCopiesChange = (
    funcType: 'onChange' | 'onMinus' | 'onPlus',
    event?: React.FormEvent<HTMLInputElement>
  ) => {
    let newValue: number;
    switch (funcType) {
      case 'onChange': {
        const value = Number((event?.target as HTMLInputElement)?.value);
        newValue = Math.max(1, Math.min(value || 1, 12));
        break;
      }
      case 'onMinus': {
        newValue = Math.max(backupCopies - 1, 1);
        break;
      }
      case 'onPlus': {
        newValue = Math.min(backupCopies + 1, 12);
        break;
      }
    }
    setBackupCopies(newValue);
  };

  // Dispatch cron schedule and frequency when they change
  React.useEffect(() => {
    dispatch({
      type: 'backingStorage/automaticBackup/frequency',
      payload: cron,
    });
  }, [cron, dispatch]);

  React.useEffect(() => {
    dispatch({
      type: 'backingStorage/automaticBackup/copies',
      payload: backupCopies,
    });
  }, [backupCopies, dispatch]);

  return (
    <>
      <Checkbox
        id="automatic-backup"
        label={t('Automatic backup')}
        description={t(
          'Opt in for automatic backup for MultiCloud Object Gateway metadata database'
        )}
        isChecked={isAutomaticBackup}
        onChange={() =>
          dispatch({
            type: 'backingStorage/setAutomaticBackup',
            payload: !isAutomaticBackup,
          })
        }
        className="odf-advanced-settings__checkbox"
      />
      {isAutomaticBackup && (
        <>
          <FormGroup
            role="radiogroup"
            fieldId="backup-frequency-radio-group"
            label={t('Backup frequency')}
            labelIcon={<QuestionCircleIcon />}
            className="pf-v5-u-mb-sm"
            isRequired
          >
            <Radio
              name="backup-frequency"
              label={t('Daily')}
              id="backup-frequency-daily"
              description={t('Backup occurs at 12:00 AM every day')}
              isChecked={selectedFrequency === CronTime.DAILY}
              onChange={() => handleSelect(CronTime.DAILY)}
              className="pf-v5-u-p-sm"
            />
            <Radio
              name="backup-frequency"
              label={t('Weekly')}
              id="backup-frequency-weekly"
              description={t('Backup occurs at 12:00 AM every Saturday')}
              isChecked={selectedFrequency === CronTime.WEEKLY}
              onChange={() => handleSelect(CronTime.WEEKLY)}
              className="pf-v5-u-p-sm"
            />
            <Radio
              name="backup-frequency"
              label={t('Monthly')}
              id="backup-frequency-monthly"
              description={t(
                'Backup occurs at 12:00 AM on the first Saturday of each month'
              )}
              isChecked={selectedFrequency === CronTime.MONTHLY}
              onChange={() => handleSelect(CronTime.MONTHLY)}
              className="pf-v5-u-p-sm"
            />
          </FormGroup>
          <FormGroup
            fieldId="backup-copies"
            label={t('Number of backup copies to be retained')}
            isRequired
          >
            <NumberInput
              id="backup-copies-input"
              value={backupCopies}
              min={1}
              max={12}
              onMinus={() => onBackupCopiesChange('onMinus')}
              onPlus={() => onBackupCopiesChange('onPlus')}
              onChange={(event) => onBackupCopiesChange('onChange', event)}
              minusBtnAriaLabel={t('Decrement')}
              plusBtnAriaLabel={t('Increment')}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t('Number of backups can be between 1-12')}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </>
      )}
    </>
  );
};
