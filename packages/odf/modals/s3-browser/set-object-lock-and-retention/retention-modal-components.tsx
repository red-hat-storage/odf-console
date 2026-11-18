import * as React from 'react';
import { ObjectLockRetentionMode } from '@aws-sdk/client-s3';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { RetentionPeriodUnit } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant, Tile } from '@patternfly/react-core/deprecated';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  Popover,
  SelectOption,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

export const getErrorMessage = (error: Error): string =>
  error?.message || JSON.stringify(error);

const periodUnitOptions: JSX.Element[] = Object.values(RetentionPeriodUnit).map(
  (unit) => (
    <SelectOption key={unit} value={unit}>
      {unit}
    </SelectOption>
  )
);

type RetentionHelpPopoverProps = {
  bodyContent: string;
};

export const RetentionHelpPopover: React.FC<RetentionHelpPopoverProps> = ({
  bodyContent,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Popover aria-label={t('Help')} bodyContent={bodyContent}>
      <Button
        icon={<OutlinedQuestionCircleIcon />}
        variant={ButtonVariant.plain}
        aria-label={t('Help')}
      />
    </Popover>
  );
};

type RetentionModeTilesProps = {
  retentionMode: ObjectLockRetentionMode;
  onChange: (mode: ObjectLockRetentionMode) => void;
  // Governance cannot be re-selected once Compliance is in effect.
  isGovernanceDisabled?: boolean;
};

export const RetentionModeTiles: React.FC<RetentionModeTilesProps> = ({
  retentionMode,
  onChange,
  isGovernanceDisabled = false,
}) => {
  const { t } = useCustomTranslation();

  return (
    <FormGroup label={t('Retention Mode')} fieldId="retention-mode">
      <Flex gap={{ default: 'gapMd' }}>
        <FlexItem flex={{ default: 'flex_1' }}>
          <Tile
            title={t('Governance mode')}
            isSelected={retentionMode === ObjectLockRetentionMode.GOVERNANCE}
            onClick={() =>
              !isGovernanceDisabled &&
              onChange(ObjectLockRetentionMode.GOVERNANCE)
            }
            isDisabled={isGovernanceDisabled}
          >
            {t(
              'Users with special permissions can overwrite or delete object during retention'
            )}
          </Tile>
        </FlexItem>
        <FlexItem flex={{ default: 'flex_1' }}>
          <Tile
            title={t('Compliance mode')}
            isSelected={retentionMode === ObjectLockRetentionMode.COMPLIANCE}
            onClick={() => onChange(ObjectLockRetentionMode.COMPLIANCE)}
          >
            {t(
              'No users can overwrite or delete the object during the retention period. This mode has strict restrictions'
            )}
          </Tile>
        </FlexItem>
      </Flex>
    </FormGroup>
  );
};

type RetentionPeriodFieldProps = {
  period: number;
  onPeriodChange: (period: number) => void;
  unit: RetentionPeriodUnit;
  onUnitChange: (unit: RetentionPeriodUnit) => void;
  helperText: string;
};

export const RetentionPeriodField: React.FC<RetentionPeriodFieldProps> = ({
  period,
  onPeriodChange,
  unit,
  onUnitChange,
  helperText,
}) => {
  const { t } = useCustomTranslation();

  return (
    <FormGroup
      label={t('Retention Period')}
      fieldId="retention-period"
      className="pf-v6-u-mt-md"
    >
      <Flex gap={{ default: 'gapSm' }}>
        <FlexItem>
          <NumberInput
            id="retention-period"
            value={period}
            min={0}
            onMinus={() => onPeriodChange(Math.max(period - 1, 0))}
            onPlus={() => onPeriodChange(period + 1)}
            onChange={(event?: React.FormEvent<HTMLInputElement>) => {
              const value = Math.round(
                +(event?.target as HTMLInputElement)?.value || 0
              );
              onPeriodChange(Math.max(value, 0));
            }}
            inputAriaLabel={t('Retention period')}
          />
        </FlexItem>
        <FlexItem>
          <SingleSelectDropdown
            id="retention-period-unit"
            selectOptions={periodUnitOptions}
            selectedKey={unit}
            onChange={(selected: RetentionPeriodUnit) => onUnitChange(selected)}
          />
        </FlexItem>
      </Flex>
      <FormHelperText>
        <HelperText>
          <HelperTextItem>{helperText}</HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

type RetentionModalActionsProps = {
  confirmLabel: string;
  onConfirm: () => void;
  closeModal: () => void;
  isConfirmDisabled: boolean;
  inProgress: boolean;
  error: Error;
};

export const RetentionModalActions: React.FC<RetentionModalActionsProps> = ({
  confirmLabel,
  onConfirm,
  closeModal,
  isConfirmDisabled,
  inProgress,
  error,
}) => {
  const { t } = useCustomTranslation();

  return (
    <ButtonBar inProgress={inProgress} errorMessage={getErrorMessage(error)}>
      <span>
        <Button
          variant={ButtonVariant.primary}
          onClick={onConfirm}
          isDisabled={isConfirmDisabled}
          className="pf-v6-u-mr-xs"
        >
          {confirmLabel}
        </Button>
        <Button
          variant={ButtonVariant.link}
          onClick={closeModal}
          className="pf-v6-u-ml-xs"
        >
          {t('Cancel')}
        </Button>
      </span>
    </ButtonBar>
  );
};

type DisableRetentionConfirmModalProps = {
  isOpen: boolean;
  closeModal: () => void;
  title: string;
  description: string;
  onDisable: () => void;
  inProgress: boolean;
  error: Error;
};

export const DisableRetentionConfirmModal: React.FC<
  DisableRetentionConfirmModalProps
> = ({
  isOpen,
  closeModal,
  title,
  description,
  onDisable,
  inProgress,
  error,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Modal
      title={title}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      description={<div className="text-muted">{description}</div>}
      variant={ModalVariant.medium}
      actions={[
        <RetentionModalActions
          confirmLabel={t('Disable')}
          onConfirm={onDisable}
          closeModal={closeModal}
          isConfirmDisabled={!!error || inProgress}
          inProgress={inProgress}
          error={error}
        />,
      ]}
    >
      {' '}
    </Modal>
  );
};
