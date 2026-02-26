import * as React from 'react';
import { VolumeSnapshotClassKind, VolumeSnapshotClassModel } from '@odf/shared';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidWatchK8sResourceObj } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  Checkbox,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  Radio,
  SelectOption,
} from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import { WizardDispatch, WizardState } from '../../../reducer';

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

const getCronTimeFromSchedule = (schedule: string): CronTime => {
  const entry = Object.entries(CRON_MAP).find(
    ([, value]) => value === schedule
  );
  return entry ? (entry[0] as CronTime) : CronTime.DAILY;
};

const selectOptions = (volumeSnapshotClasses: VolumeSnapshotClassKind[]) =>
  volumeSnapshotClasses?.map((vsc) => (
    <SelectOption
      key={vsc.metadata.uid}
      value={vsc.metadata.name}
      data-test-id={vsc.metadata.name}
    >
      {getName(vsc)}
    </SelectOption>
  )) || [];

type AutomaticBackupProps = {
  dispatch: WizardDispatch;
  isDbBackup: boolean;
  isMCG: boolean;
  isExternalPostgresEnabled: boolean;
  dbBackup: WizardState['advancedSettings']['dbBackup'];
};

export const AutomaticBackup: React.FC<AutomaticBackupProps> = ({
  dispatch,
  isDbBackup,
  isMCG,
  dbBackup,
  isExternalPostgresEnabled,
}) => {
  const { t } = useCustomTranslation();
  const { schedule, volumeSnapshot } = dbBackup;
  const [volumeSnapshotClasses, vscLoaded] = useK8sWatchResource<
    VolumeSnapshotClassKind[]
  >(
    getValidWatchK8sResourceObj(
      {
        groupVersionKind: {
          group: VolumeSnapshotClassModel.apiGroup,
          version: VolumeSnapshotClassModel.apiVersion,
          kind: VolumeSnapshotClassModel.kind,
        },
        isList: true,
      },
      isMCG
    )
  );

  const selectedFrequency = getCronTimeFromSchedule(schedule);
  const handleSelect = (type: CronTime) => {
    dispatch({
      type: 'advancedSettings/dbBackup/schedule',
      payload: CRON_MAP[type],
    });
  };

  const onVolumeSnapshotChange = (vscName: string) => {
    dispatch({
      type: 'advancedSettings/dbBackup/volumeSnapshot/volumeSnapshotClass',
      payload: vscName,
    });
  };

  const onBackupCopiesChange = (
    funcType: 'onChange' | 'onMinus' | 'onPlus',
    event?: React.FormEvent<HTMLInputElement>
  ) => {
    let newValue: number;
    switch (funcType) {
      case 'onChange': {
        const value = (event.target as HTMLInputElement).value;
        const numValue = parseInt(value, 10);
        newValue = isNaN(numValue)
          ? 0
          : Math.max(1, Math.min(numValue || 1, 12));
        break;
      }
      case 'onMinus': {
        newValue = Math.max(volumeSnapshot.maxSnapshots - 1, 1);
        break;
      }
      case 'onPlus': {
        newValue = Math.min(volumeSnapshot.maxSnapshots + 1, 12);
        break;
      }
    }
    dispatch({
      type: 'advancedSettings/dbBackup/volumeSnapshot/maxSnapshots',
      payload: newValue,
    });
  };

  return (
    <>
      <Checkbox
        id="automatic-backup"
        label={t('Automatic backup')}
        description={t(
          'Opt in for automatic backup for MultiCloud Object Gateway metadata database'
        )}
        isChecked={isDbBackup}
        isDisabled={!vscLoaded || isExternalPostgresEnabled}
        onChange={() =>
          dispatch({
            type: 'advancedSettings/setDbBackup',
            payload: !isDbBackup,
          })
        }
        className="odf-advanced-settings__checkbox"
      />
      {!vscLoaded && (
        <Alert
          variant="info"
          title={t('No volume snapshot class present')}
          isInline
          className="pf-v6-u-mt-sm"
        >
          {t(
            'VolumeSnapshotClass is required to use this feature. Ensure a VolumeSnapshotClass is present in the cluster.'
          )}
        </Alert>
      )}
      {isDbBackup && (
        <>
          <FormGroup
            role="radiogroup"
            fieldId="backup-frequency-radio-group"
            label={t('Backup frequency')}
            labelHelp={<QuestionCircleIcon />}
            className="pf-v6-u-mt-md"
            isRequired
          >
            <Radio
              name="backup-frequency"
              label={t('Daily')}
              id="backup-frequency-daily"
              description={t('Backup occurs at 12:00 AM every day')}
              isChecked={selectedFrequency === CronTime.DAILY}
              onChange={() => handleSelect(CronTime.DAILY)}
              className="pf-v6-u-p-sm"
            />
            <Radio
              name="backup-frequency"
              label={t('Weekly')}
              id="backup-frequency-weekly"
              description={t('Backup occurs at 12:00 AM every Saturday')}
              isChecked={selectedFrequency === CronTime.WEEKLY}
              onChange={() => handleSelect(CronTime.WEEKLY)}
              className="pf-v6-u-p-sm"
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
              className="pf-v6-u-p-sm"
            />
          </FormGroup>
          <FormGroup
            fieldId="backup-copies"
            label={t('Number of backup copies to be retained')}
            className="pf-v6-u-mb-sm"
            isRequired
          >
            <NumberInput
              id="backup-copies-input"
              value={volumeSnapshot.maxSnapshots}
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
          {isMCG && (
            <FormGroup
              fieldId="backup-add-volumeSnapshotClass"
              label={t('Add VolumeSnapshotClass')}
              className="pf-v6-u-mt-md"
              isRequired
            >
              <SingleSelectDropdown
                id="volume-snapshot-class-dropdown"
                className="pf-v6-u-w-50 pf-v6-u-mt-sm"
                selectedKey={volumeSnapshot.volumeSnapshotClass}
                selectOptions={selectOptions(volumeSnapshotClasses)}
                onChange={onVolumeSnapshotChange}
                placeholderText={t('Select a VolumeSnapshotClass')}
              />
            </FormGroup>
          )}
        </>
      )}
    </>
  );
};
