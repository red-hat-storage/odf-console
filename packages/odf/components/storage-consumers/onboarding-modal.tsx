import * as React from 'react';
import {
  DiskSize as QuotaSize,
  diskSizeUnitOptions as QuotaSizeUnitOptions,
  onboardingTokenTooltip,
} from '@odf/core/constants';
import { StorageQuota } from '@odf/core/types';
import { isUnlimitedQuota, isValidQuota } from '@odf/core/utils';
import { ODF_PROXY_ROOT_PATH, FieldLevelHelp, ModalFooter } from '@odf/shared';
import { ModalBody, ModalTitle } from '@odf/shared/generic/ModalTitle';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ExternalLink, getLastLanguage } from '@odf/shared/utils';
import { HttpError } from '@odf/shared/utils/error/http-error';
import { RequestSizeInput } from '@odf/shared/utils/RequestSizeInput';
import {
  BlueInfoCircleIcon,
  GreenCheckCircleIcon,
  StatusIconAndText,
  consoleFetch,
} from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Trans } from 'react-i18next';
import {
  Modal,
  Button,
  ModalVariant,
  FlexItem,
  Flex,
  Alert,
  Radio,
  FormGroup,
  LevelItem,
  Level,
  AlertVariant,
  ButtonVariant,
  TextArea,
} from '@patternfly/react-core';
import { CopyIcon } from '@patternfly/react-icons';
import './onboarding-modal.scss';

const unlimitedQuota: StorageQuota = {
  value: 0,
  unit: null,
};
const defaultCustomQuota: StorageQuota = {
  value: 1,
  unit: QuotaSize.Gi,
};

const getTimestamp = () =>
  new Intl.DateTimeFormat(getLastLanguage() || undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
    timeZoneName: 'short',
    hour12: false,
  }).format(new Date());

type ClientOnBoardingModalProps = ModalComponent<{
  isOpen: boolean;
}>;

export const ClientOnBoardingModal: ClientOnBoardingModalProps = ({
  isOpen,
  closeModal,
}) => {
  const { t } = useCustomTranslation();
  const [token, setToken] = React.useState('');
  const [tokenGenerationTimestamp, setTokenGenerationTimestamp] =
    React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState<string>(null);
  const [quota, setQuota] = React.useState({ ...unlimitedQuota });

  const generateToken = () => {
    setInProgress(true);
    consoleFetch(`${ODF_PROXY_ROOT_PATH}/provider-proxy/onboarding-tokens`, {
      method: 'post',
      body: quota.value > 0 ? JSON.stringify(quota) : null,
    })
      .then((response) => {
        setInProgress(false);
        if (!response.ok) {
          throw new Error('Network response is not ok!');
        }
        return response.text();
      })
      .then((text) => {
        setToken(text);
        setTokenGenerationTimestamp(getTimestamp());
      })
      .catch((err: HttpError) => {
        setInProgress(false);
        setError(err.message);
      });
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} variant={ModalVariant.medium}>
      <ModalTitle>{t('Client onboarding token')}</ModalTitle>
      {token ? (
        <ModalBody>
          <TokenViewBody
            token={token}
            quota={quota}
            tokenGenerationTimestamp={tokenGenerationTimestamp}
          />
        </ModalBody>
      ) : (
        <>
          <ModalBody>
            <p className="odf-onboarding-modal__title-desc">
              {t(
                'Add storage capacity for the client cluster to consume from the provider cluster.'
              )}
            </p>
            {error && (
              <Alert
                variant={AlertVariant.danger}
                isInline
                title={t('Can not generate an onboarding token at the moment')}
              >
                <Trans>
                  The token generation service is currently unavailable. Contact
                  our{' '}
                  <ExternalLink href="https://access.redhat.com/support/">
                    customer support
                  </ExternalLink>{' '}
                  for further help.
                </Trans>
              </Alert>
            )}
            <StorageQuotaBody quota={quota} setQuota={setQuota} />
          </ModalBody>
          <ModalFooter inProgress={inProgress}>
            <Flex direction={{ default: 'row' }}>
              <FlexItem>
                <Button
                  key="cancel"
                  variant={ButtonVariant.secondary}
                  onClick={closeModal}
                  data-test-id="modal-cancel-action"
                >
                  {t('Cancel')}
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  key="save"
                  data-test="modal-submit-action"
                  data-test-id="confirm-action"
                  variant={ButtonVariant.primary}
                  onClick={() => generateToken()}
                  isDisabled={inProgress}
                  isLoading={inProgress}
                >
                  {inProgress ? t('Generating token') : t('Generate token')}
                </Button>
              </FlexItem>
            </Flex>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
};

type StorageQuotaBodyProps = {
  quota: StorageQuota;
  setQuota: React.Dispatch<React.SetStateAction<StorageQuota>>;
  initialQuota?: StorageQuota;
  capacityInfo?: React.ReactNode;
};

export const StorageQuotaBody: React.FC<StorageQuotaBodyProps> = ({
  quota,
  setQuota,
  initialQuota,
  capacityInfo,
}) => {
  const { t } = useCustomTranslation();

  const onCustomQuotaChange = (customQuota: StorageQuota) => {
    setQuota({ ...customQuota });
  };

  const unlimitedQuotaTypeText = t('Unlimited');
  const customQuotaTypeText = t('Custom');

  return (
    <>
      <FormGroup
        label={`${t('Storage quota:')} ${
          isUnlimitedQuota(quota) ? unlimitedQuotaTypeText : customQuotaTypeText
        }`}
        labelInfo={capacityInfo}
        className="pf-v5-u-font-size-md odf-onboarding-modal__quota-desc"
      >
        <Radio
          label={unlimitedQuotaTypeText}
          value="unlimited"
          id="storage-quota-unlimited"
          name="storage-quota"
          description={<UnlimitedRadioDescription quota={quota} />}
          isChecked={isUnlimitedQuota(quota)}
          onChange={() => {
            setQuota({ ...unlimitedQuota });
          }}
        />
        <Radio
          label={customQuotaTypeText}
          value="custom"
          id="storage-quota-custom"
          name="storage-quota"
          description={t(
            'Limit the amount of storage that a client cluster can consume.'
          )}
          className="pf-v5-u-mt-lg"
          isChecked={!isUnlimitedQuota(quota)}
          isDisabled={initialQuota && isUnlimitedQuota(initialQuota)}
          onChange={() => {
            setQuota({ ...(initialQuota || defaultCustomQuota) });
          }}
        />
      </FormGroup>
      {!isUnlimitedQuota(quota) && (
        <div className="pf-v5-u-ml-lg pf-v5-u-mt-md">
          <span className="pf-v5-u-font-weight-bold">
            {t('Allocate quota')}
          </span>
          <RequestSizeInput
            name={t('Allocate quota')}
            onChange={onCustomQuotaChange}
            dropdownUnits={QuotaSizeUnitOptions}
            defaultRequestSizeUnit={quota.unit}
            defaultRequestSizeValue={String(quota.value)}
            minValue={1}
          >
            {!isValidQuota(quota, initialQuota) && (
              <Alert
                className="odf-onboarding-modal__invalid-quota"
                variant={AlertVariant.danger}
                isInline
                title={t(
                  'Storage quota cannot be decreased. Assign a quota higher than your current allocation.'
                )}
              ></Alert>
            )}
          </RequestSizeInput>
        </div>
      )}
    </>
  );
};

type UnlimitedRadioDescriptionProps = {
  quota: StorageQuota;
};

const UnlimitedRadioDescription: React.FC<UnlimitedRadioDescriptionProps> = ({
  quota,
}) => {
  const { t } = useCustomTranslation();
  return (
    <>
      <p>
        {t('No specific limit on storage that a client cluster can consume.')}
      </p>
      {isUnlimitedQuota(quota) && (
        <Alert
          variant={AlertVariant.info}
          isInline
          title={t(
            'Changing the storage quota from unlimited to custom is not supported after the client cluster is onboarded.'
          )}
        ></Alert>
      )}
    </>
  );
};

type TokenViewBodyProps = {
  token: string;
  quota: StorageQuota;
  tokenGenerationTimestamp: string;
};

const TokenViewBody: React.FC<TokenViewBodyProps> = ({
  token,
  quota,
  tokenGenerationTimestamp,
}) => {
  const { t } = useCustomTranslation();

  const onCopyToClipboard = () => {
    navigator.clipboard.writeText(token);
  };

  const quotaText = isUnlimitedQuota(quota)
    ? t('unlimited')
    : `${quota.value} ${QuotaSizeUnitOptions[quota.unit]}`;

  return (
    <Flex direction={{ default: 'column' }}>
      <FlexItem>
        <Level>
          <LevelItem className="pf-v5-u-font-weight-bold">
            {t('Onboarding token')}
            <FieldLevelHelp position="right">
              {onboardingTokenTooltip(t)}
            </FieldLevelHelp>
          </LevelItem>
          <LevelItem>
            <span className="pf-v5-u-font-size-sm pf-v5-u-color-200">
              {t('Generated on')}: {tokenGenerationTimestamp}
            </span>
            <span className="pf-v5-u-ml-sm odf-onboarding-modal__timestamp-icon">
              <GreenCheckCircleIcon />
            </span>
          </LevelItem>
        </Level>
      </FlexItem>
      <FlexItem grow={{ default: 'grow' }}>
        <TextArea
          value={token}
          className="odf-onboarding-modal__text-area"
          aria-label={t('Onboarding token')}
          readOnlyVariant="default"
          resizeOrientation="vertical"
        />
      </FlexItem>
      <FlexItem className="pf-v5-u-mb-lg">
        <Trans t={t} ns="plugin__odf-console">
          On an OpenShift cluster, deploy the Data Foundation client operator
          using the generated token. The token includes an{' '}
          <strong>{quotaText}</strong> storage quota for client consumption.
        </Trans>
      </FlexItem>
      <FlexItem>
        <Button
          type="button"
          onClick={onCopyToClipboard}
          variant={ButtonVariant.primary}
          className="odf-onboarding-modal__clipboard"
        >
          <CopyIcon className="pf-v5-u-ml-md pf-v5-u-mr-sm" />
          {t('Copy to clipboard')}
        </Button>
      </FlexItem>
      <FlexItem>
        <StatusIconAndText
          title={t(
            'This token is for one-time use only and is valid for 48 hours.'
          )}
          icon={<BlueInfoCircleIcon />}
          className="text-muted odf-onboarding-modal__info-icon"
        />
      </FlexItem>
    </Flex>
  );
};
