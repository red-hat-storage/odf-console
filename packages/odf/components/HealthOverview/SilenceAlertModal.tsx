import * as React from 'react';
import { StorageClusterModel } from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import { ExcludedAlert, StorageClusterKind, Patch } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { consoleFetch, k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import {
  Button,
  ButtonVariant,
  FormGroup,
  InputGroup,
  InputGroupItem,
  NumberInput,
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
  MenuToggleElement,
  Alert,
  AlertVariant,
  Radio,
  Popover,
} from '@patternfly/react-core';
import { BellIcon, HelpIcon } from '@patternfly/react-icons';
import { AlertRowData, SilenceType, SilenceTypes } from './hooks';

type DurationUnit = 'hours' | 'days' | 'weeks';

type SilenceAlertModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedAlerts: AlertRowData[];
  alertManagerBasePath: string;
  onSuccess?: () => void;
  storageCluster?: StorageClusterKind;
  storageClusterLoaded?: boolean;
};

const DURATION_UNIT_MULTIPLIERS: Record<DurationUnit, number> = {
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
};

export const SilenceAlertModal: React.FC<SilenceAlertModalProps> = ({
  isOpen,
  onClose,
  selectedAlerts,
  alertManagerBasePath,
  onSuccess,
  storageCluster,
  storageClusterLoaded,
}) => {
  // Custom hooks
  const { t } = useCustomTranslation();

  // State hooks
  const [silenceType, setSilenceType] =
    React.useState<SilenceType>(SilenceTypes.TIME_BOUND);
  const [durationValue, setDurationValue] = React.useState(1);
  const [durationUnit, setDurationUnit] = React.useState<DurationUnit>('hours');
  const [isUnitSelectOpen, setIsUnitSelectOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Refs - Modal content container for scoped input access
  const modalContentRef = React.useRef<HTMLDivElement>(null);

  // Memoized values
  const durationUnitOptions = React.useMemo(
    () => [
      { value: 'hours', label: t('hours') },
      { value: 'days', label: t('days') },
      { value: 'weeks', label: t('weeks') },
    ],
    [t]
  );

  // Event handlers
  const handleDurationChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = (event.target as HTMLInputElement).value;
    const numValue = parseInt(value, 10);
    setDurationValue(isNaN(numValue) ? 0 : Math.max(0, numValue));
  };

  const handleMinus = () => {
    setDurationValue((prev) => Math.max(0, prev - 1));
  };

  const handlePlus = () => {
    setDurationValue((prev) => prev + 1);
  };

  // Callbacks
  const handleUnitSelect = React.useCallback(
    (_event: React.MouseEvent | undefined, selection: string) => {
      setDurationUnit(selection as DurationUnit);
      setIsUnitSelectOpen(false);
    },
    []
  );

  /**
   * Creates indefinite silence by adding alert entries to StorageCluster.spec.monitoring.excludedAlerts
   */
  const createIndefiniteSilence = async () => {
    if (!storageCluster) {
      throw new Error(t('StorageCluster not available'));
    }

    const now = new Date().toISOString();
    const newAlertEntries: ExcludedAlert[] = selectedAlerts.map((alert) => ({
      alertName: alert.alertname,
      disabledAt: now,
      severity: alert.severity,
    }));

    const existingExcludedAlerts =
      storageCluster.spec?.monitoring?.excludedAlerts || [];
    const existingAlertNames = new Set(
      existingExcludedAlerts.map((a) => a.alertName)
    );

    // Filter out alerts that are already excluded, then merge
    const alertsToAdd = newAlertEntries.filter(
      (alert) => !existingAlertNames.has(alert.alertName)
    );

    // Skip patch if no new alerts to add
    if (alertsToAdd.length === 0) {
      return;
    }

    const newExcludedAlerts = [...existingExcludedAlerts, ...alertsToAdd];

    const patch: Patch[] = [];

    // If monitoring doesn't exist, add it first
    if (!storageCluster.spec?.monitoring) {
      patch.push({
        op: 'add',
        path: '/spec/monitoring',
        value: { excludedAlerts: newExcludedAlerts },
      });
    } else if (existingExcludedAlerts.length === 0) {
      patch.push({
        op: 'add',
        path: '/spec/monitoring/excludedAlerts',
        value: newExcludedAlerts,
      });
    } else {
      patch.push({
        op: 'replace',
        path: '/spec/monitoring/excludedAlerts',
        value: newExcludedAlerts,
      });
    }

    await k8sPatch({
      model: StorageClusterModel,
      resource: {
        metadata: {
          name: getName(storageCluster),
          namespace: getNamespace(storageCluster),
        },
      },
      data: patch,
    });
  };

  /**
   * Creates time-bound silence via Alertmanager
   */
  const createTimeBoundSilence = async () => {
    if (!alertManagerBasePath || durationValue <= 0) {
      throw new Error(t('Invalid duration or Alertmanager unavailable'));
    }

    const now = new Date();
    const durationMs = durationValue * DURATION_UNIT_MULTIPLIERS[durationUnit];
    const endsAt = new Date(now.getTime() + durationMs);

    // Create matchers from all selected alerts' labels
    // We need to create a separate silence for each alert since they may have different labels
    const silencePromises = selectedAlerts.map((alert) => {
      const matchers = Object.entries(alert.labels).map(([name, value]) => ({
        name,
        value,
        isRegex: false,
        isEqual: true,
      }));

      const silenceData = {
        matchers,
        startsAt: now.toISOString(),
        endsAt: endsAt.toISOString(),
        comment: t(
          'Silenced via ODF Health Overview for {{duration}} {{unit}}',
          { duration: durationValue, unit: durationUnit }
        ),
        createdBy: 'odf-console',
      };

      return consoleFetch(`${alertManagerBasePath}/api/v2/silences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(silenceData),
      }).then((response) => {
        if (!response?.ok) {
          throw new Error(
            `${response.status} ${response.statusText || t('Unknown error')}`
          );
        }
        return response.json();
      });
    });

    await Promise.all(silencePromises);
  };

  const createSilence = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (silenceType === SilenceTypes.INDEFINITE) {
        await createIndefiniteSilence();
      } else {
        await createTimeBoundSilence();
      }

      // Success - close modal and notify parent
      onSuccess?.();
      onClose();

      // Reset form
      setSilenceType(SilenceTypes.TIME_BOUND);
      setDurationValue(1);
      setDurationUnit('hours');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('Failed to create silence. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      // reset form values on close / cancel
      setSilenceType(SilenceTypes.TIME_BOUND);
      setDurationValue(1);
      setDurationUnit('hours');
      onClose();
    }
  };

  const isSilenceDisabled =
    (silenceType === SilenceTypes.TIME_BOUND && durationValue <= 0) ||
    (silenceType === SilenceTypes.INDEFINITE && !storageCluster) ||
    isSubmitting;

  const unitToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsUnitSelectOpen((prev) => !prev)}
      isExpanded={isUnitSelectOpen}
      style={{ minWidth: '120px' }}
      isDisabled={isSubmitting}
    >
      {durationUnitOptions.find((opt) => opt.value === durationUnit)?.label ||
        t('hours')}
    </MenuToggle>
  );

  // Effects - Auto focus on duration input when modal opens
  React.useEffect(() => {
    if (isOpen && modalContentRef.current) {
      // Use setTimeout to ensure the modal is fully rendered before focusing
      setTimeout(() => {
        const input = modalContentRef.current?.querySelector(
          'input[name="duration"]'
        ) as HTMLInputElement;
        input?.focus();
      }, 100);
    }
  }, [isOpen]);

  return (
    <Modal
      variant={ModalVariant.small}
      title={t('Silence alert')}
      titleIconVariant={BellIcon}
      isOpen={isOpen}
      onClose={handleClose}
      actions={[
        <Button
          key="silence"
          variant={ButtonVariant.primary}
          onClick={createSilence}
          isDisabled={isSilenceDisabled}
          isLoading={isSubmitting}
        >
          {t('Silence')}
        </Button>,
        <Button
          key="cancel"
          variant={ButtonVariant.link}
          onClick={handleClose}
          isDisabled={isSubmitting}
        >
          {t('Cancel')}
        </Button>,
      ]}
    >
      <div ref={modalContentRef}>
        <p className="pf-v6-u-mb-md">
          {t(
            'Temporarily mute alerts matching the selected checks and conditions. Silenced alerts will not appear in the table or affect the health score.'
          )}
        </p>

        {error && (
          <Alert
            variant={AlertVariant.danger}
            isInline
            title={t('Error creating silence')}
            className="pf-v6-u-mb-md"
          >
            {error}
          </Alert>
        )}

        <FormGroup
          label={t('Duration')}
          isRequired
          labelHelp={
            <Popover
              headerContent={t('Silence types')}
              bodyContent={
                <>
                  <p>
                    <strong>{t('Indefinite')}</strong>:{' '}
                    {t(
                      'Persists across pod restarts and system updates. Stored in StorageCluster configuration.'
                    )}
                  </p>
                  <p className="pf-v6-u-mt-sm">
                    <strong>{t('Limited time')}</strong>:{' '}
                    {t(
                      'Temporary silence via Alertmanager. Will expire after the specified duration.'
                    )}
                  </p>
                </>
              }
            >
              <button
                type="button"
                className="pf-v6-c-form__group-label-help"
                aria-label={t('More information about silence types')}
              >
                <HelpIcon />
              </button>
            </Popover>
          }
        >
          <Radio
            isChecked={silenceType === SilenceTypes.INDEFINITE}
            name="silence-type"
            onChange={() => setSilenceType(SilenceTypes.INDEFINITE)}
            label={t('Indefinite')}
            description={t('Silence will be recreated if pods restart')}
            id="silence-type-indefinite"
            isDisabled={
              !storageCluster || !storageClusterLoaded || isSubmitting
            }
          />
          <Radio
            isChecked={silenceType === SilenceTypes.TIME_BOUND}
            name="silence-type"
            onChange={() => setSilenceType(SilenceTypes.TIME_BOUND)}
            label={t('Time-bound')}
            id="silence-type-time-bound"
            className="pf-v6-u-mt-sm"
            isDisabled={isSubmitting}
          />
        </FormGroup>

        {silenceType === SilenceTypes.TIME_BOUND && (
          <FormGroup label={t('Time limit')} isRequired>
            <InputGroup>
              <InputGroupItem isFill>
                <NumberInput
                  value={durationValue}
                  onChange={handleDurationChange}
                  onMinus={handleMinus}
                  onPlus={handlePlus}
                  min={0}
                  inputName="duration"
                  inputAriaLabel={t('Duration value')}
                  minusBtnAriaLabel={t('Decrease duration')}
                  plusBtnAriaLabel={t('Increase duration')}
                  widthChars={10}
                  isDisabled={isSubmitting}
                />
              </InputGroupItem>
              <InputGroupItem>
                <Select
                  isOpen={isUnitSelectOpen}
                  selected={durationUnit}
                  onSelect={handleUnitSelect}
                  onOpenChange={setIsUnitSelectOpen}
                  toggle={unitToggle}
                  shouldFocusFirstItemOnOpen
                  shouldFocusToggleOnSelect
                >
                  <SelectList>
                    {durationUnitOptions.map((option) => (
                      <SelectOption key={option.value} value={option.value}>
                        {option.label}
                      </SelectOption>
                    ))}
                  </SelectList>
                </Select>
              </InputGroupItem>
            </InputGroup>
          </FormGroup>
        )}

        {selectedAlerts.length > 0 && (
          <Alert
            variant={AlertVariant.info}
            isInline
            isPlain
            title={t('{{count}} alert(s) will be silenced', {
              count: selectedAlerts.length,
            })}
            className="pf-v6-u-mt-md"
          />
        )}
      </div>
    </Modal>
  );
};
