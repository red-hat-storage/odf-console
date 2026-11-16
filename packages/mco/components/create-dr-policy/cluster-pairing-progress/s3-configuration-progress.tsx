import * as React from 'react';
import { S3_CONFIGURATION_PHASE_DISPLAY_TEXT } from '@odf/mco/constants';
import { S3ConfigurationKind } from '@odf/mco/types';
import {
  getS3ConfigurationPhase,
  isS3ConfigurationFailed,
  isS3ConfigurationReady,
} from '@odf/mco/utils/s3-configuration';
import { getName } from '@odf/shared/selectors';
import { RedExclamationCircleIcon } from '@odf/shared/status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  AlertVariant,
  Bullseye,
  Button,
  ButtonVariant,
  Progress,
  ProgressMeasureLocation,
  ProgressSize,
  ProgressVariant,
  Spinner,
  spinnerSize,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import '../create-dr-policy.scss';

export type S3ConfigurationProgressProps = {
  s3ConfigurationNames: string[];
  s3Configurations: S3ConfigurationKind[];
  onComplete: () => void;
  onClose: () => void;
};

/** DRCluster creation is async inside the controller, so wait before declaring success. */
export const S3ConfigurationProgress: React.FC<
  S3ConfigurationProgressProps
> = ({ s3ConfigurationNames, s3Configurations, onComplete, onClose }) => {
  const { t } = useCustomTranslation();

  // Newly created resources may be briefly absent from the watched list.
  const s3ConfigurationsByName = new Map(
    (s3Configurations ?? []).map((config) => [getName(config), config])
  );
  const tracked = s3ConfigurationNames.map((name) =>
    s3ConfigurationsByName.get(name)
  );

  const readyCount = tracked.filter(isS3ConfigurationReady).length;
  const failed = tracked.find(isS3ConfigurationFailed);
  const isComplete =
    !!s3ConfigurationNames.length && readyCount === s3ConfigurationNames.length;

  React.useEffect(() => {
    if (isComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  const progress = s3ConfigurationNames.length
    ? Math.round((readyCount / s3ConfigurationNames.length) * 100)
    : 100;

  // Least advanced phase drives the title.
  const inProgressConfig = tracked.find(
    (s3Configuration) => !isS3ConfigurationReady(s3Configuration)
  );
  const phase = getS3ConfigurationPhase(inProgressConfig);
  // Several controller failure paths set phase without setting message.
  const failureMessage = failed
    ? failed.status?.message ||
      t('No further details were reported by the S3 configuration.')
    : '';

  return (
    <Bullseye className="mco-create-data-policy__pairing pf-v6-u-p-xl">
      <Stack hasGutter className="pf-v6-u-w-50">
        <StackItem className="pf-v6-u-text-align-center">
          {failed ? (
            <RedExclamationCircleIcon
              className="mco-create-data-policy__pairing-status-icon"
              title={t('Error')}
            />
          ) : (
            <Spinner
              size={spinnerSize.xl}
              aria-label={t('Configuring S3 storage')}
            />
          )}
        </StackItem>
        <StackItem className="pf-v6-u-text-align-center">
          <Title headingLevel="h2" size="lg">
            {t('Configuring S3 storage')}
          </Title>
        </StackItem>
        <StackItem className="mco-create-data-policy__pairing-progress">
          <Progress
            value={progress}
            title={S3_CONFIGURATION_PHASE_DISPLAY_TEXT(t)[phase]}
            helperText={t(
              'Setting up the object bucket used to store disaster recovery metadata.'
            )}
            measureLocation={ProgressMeasureLocation.top}
            size={ProgressSize.lg}
            variant={failed ? ProgressVariant.danger : undefined}
          />
        </StackItem>
        {!!failed && (
          <>
            <StackItem className="pf-v6-u-text-align-start">
              <Alert
                variant={AlertVariant.danger}
                isInline
                title={t('S3 configuration {{name}} failed', {
                  name: getName(failed),
                })}
              >
                {failureMessage}
              </Alert>
            </StackItem>
            <StackItem className="pf-v6-u-text-align-center">
              <Button variant={ButtonVariant.link} onClick={onClose}>
                {t('Close')}
              </Button>
            </StackItem>
          </>
        )}
      </Stack>
    </Bullseye>
  );
};
