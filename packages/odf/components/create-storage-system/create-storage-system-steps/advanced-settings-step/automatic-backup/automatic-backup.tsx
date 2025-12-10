import * as React from 'react';
import { DeploymentType } from '@odf/core/types';
import { VolumeSnapshotClassKind, VolumeSnapshotClassModel } from '@odf/shared';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
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
  deployment: DeploymentType;
};

export const AutomaticBackup: React.FC<AutomaticBackupProps> = ({
  dispatch,
  isDbBackup,
  deployment,
}) => {
  const { t } = useCustomTranslation();
  const [backupCopies, setBackupCopies] = React.useState(DEFAULT_BACKUP_COPIES);
  const [selectedFrequency, setSelectedFrequency] = React.useState<CronTime>(
    CronTime.DAILY
  );
  const [cron, setCron] = React.useState(CRON_MAP[CronTime.DAILY]);
  const [volumeSnapshotClasses, vscLoaded] = useK8sWatchResource<
    VolumeSnapshotClassKind[]
  >({
    groupVersionKind: {
      group: VolumeSnapshotClassModel.apiGroup,
      version: VolumeSnapshotClassModel.apiVersion,
      kind: VolumeSnapshotClassModel.kind,
    },
    isList: true,
  });

  const isMCG = deployment === DeploymentType.MCG;
  const hasVSCs = vscLoaded && volumeSnapshotClasses?.length > 0;
  const [selectedVolumeSnapshotClass, setSelectedVolumeSnapshotClass] =
    React.useState<string>('');

  const handleSelect = (type: CronTime) => {
    setSelectedFrequency(type);
    setCron(CRON_MAP[type] || '');
  };

  const onVolumeSnapshotChange = (vscName: string) => {
    setSelectedVolumeSnapshotClass(vscName);
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

  React.useEffect(() => {
    if (!isMCG && vscLoaded && volumeSnapshotClasses?.length > 0) {
      const rbdVSC = volumeSnapshotClasses.find((vsc) =>
        vsc.metadata.name.endsWith('rbdplugin-snapclass')
      );
      if (rbdVSC) {
        setSelectedVolumeSnapshotClass(rbdVSC.metadata.name);
      }
    }
  }, [isMCG, vscLoaded, volumeSnapshotClasses]);

  React.useEffect(() => {
    dispatch({
      type: 'backingStorage/dbBackup/schedule',
      payload: cron,
    });
  }, [cron, dispatch]);

  React.useEffect(() => {
    dispatch({
      type: 'backingStorage/dbBackup/volumeSnapshot/maxSnapshots',
      payload: backupCopies,
    });
  }, [backupCopies, dispatch]);

  React.useEffect(() => {
    if (selectedVolumeSnapshotClass) {
      dispatch({
        type: 'backingStorage/dbBackup/volumeSnapshot/volumeSnapshotClass',
        payload: selectedVolumeSnapshotClass,
      });
    }
  }, [selectedVolumeSnapshotClass, dispatch]);

  const isBackupDisabled = vscLoaded && !hasVSCs;

  return (
    <>
      <Checkbox
        id="automatic-backup"
        label={t('Automatic backup')}
        description={t(
          'Opt in for automatic backup for MultiCloud Object Gateway metadata database'
        )}
        isChecked={isDbBackup}
        isDisabled={isBackupDisabled}
        onChange={() =>
          dispatch({
            type: 'backingStorage/setDbBackup',
            payload: !isDbBackup,
          })
        }
        className="odf-advanced-settings__checkbox"
      />
      {isBackupDisabled && (
        <Alert
          variant="info"
          title={t('No volume snapshot class present')}
          isInline
          className="pf-v5-u-mt-sm"
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
            className="pf-v5-u-mb-sm"
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
          {isMCG && hasVSCs && (
            <FormGroup
              fieldId="backup-add-volumeSnapshotClass"
              label={t('Add VolumeSnapshot')}
              isRequired
            >
              <SingleSelectDropdown
                id="volume-snapshot-class-dropdown"
                className="pf-v5-u-w-50 pf-v5-u-mt-sm"
                selectedKey={selectedVolumeSnapshotClass}
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
