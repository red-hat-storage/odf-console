import * as React from 'react';
import {
  DiskSize as QuotaSize,
  diskSizeUnitOptions as QuotaSizeUnitOptions,
  onboardingTokenTooltip,
} from '@odf/core/constants';
import { StorageQuota } from '@odf/core/types';
import { isUnlimitedQuota, isValidQuota } from '@odf/core/utils';
import {
  FieldLevelHelp,
  getNamespace,
  ModalFooter,
  SecretKind,
  SecretModel,
  StorageConsumerKind,
  useK8sGet,
} from '@odf/shared';
import { ModalBody, ModalTitle } from '@odf/shared/generic/ModalTitle';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  ExternalLink,
  getLastLanguage,
  humanizeBinaryBytesWithoutB,
} from '@odf/shared/utils';
import { RequestSizeInput } from '@odf/shared/utils/RequestSizeInput';
import {
  BlueInfoCircleIcon,
  GreenCheckCircleIcon,
  k8sDelete,
  k8sGet,
  K8sKind,
  StatusIconAndText,
} from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Base64 } from 'js-base64';
import { TFunction, Trans } from 'react-i18next';
import {
  Button,
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
  Title,
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
  extraProps: {
    resource: StorageConsumerKind;
  };
  isOpen: boolean;
}>;

const pollUntilAvailable = async (
  secretName: string,
  namespace: string,
  t: TFunction,
  count = 0
): Promise<SecretKind> => {
  if (count >= 3) {
    throw new Error(t('Secret not found'));
  }
  try {
    const secret = await k8sGet({
      model: SecretModel,
      name: secretName,
      ns: namespace,
    });
    if (secret) {
      return secret;
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(pollUntilAvailable(secretName, namespace, t));
      }, 5000);
    });
  } catch {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(pollUntilAvailable(secretName, namespace, t));
      }, 5000);
    });
  }
};

export const ClientOnBoardingModal: ClientOnBoardingModalProps = ({
  isOpen,
  closeModal,
  extraProps: { resource: storageConsumer },
}) => {
  const { t } = useCustomTranslation();
  const [token, setToken] = React.useState('');
  const [tokenGenerationTimestamp, setTokenGenerationTimestamp] =
    React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState<string>(null);
  const secretName = storageConsumer.status?.onboardingTicketSecret?.name;
  const namespace = getNamespace(storageConsumer);

  const [secretResource, ,] = useK8sGet(
    SecretModel as K8sKind,
    secretName,
    namespace
  );

  const generateToken = () => {
    setInProgress(true);
    k8sDelete({
      model: SecretModel,
      resource: secretResource,
    })
      .then(() => {
        pollUntilAvailable(secretName, namespace, t)
          .then((secret) => {
            setToken(Base64.decode(secret.data['onboarding-token']));
            setTokenGenerationTimestamp(getTimestamp());
            setInProgress(false);
          })
          .catch((err) => {
            setInProgress(false);
            setError(err);
          });
      })
      .catch((err) => {
        setInProgress(false);
        setError(err);
      });
  };

  const quotaInGib = storageConsumer.spec?.storageQuotaInGiB;
  const storageQuota = quotaInGib
    ? humanizeBinaryBytesWithoutB(quotaInGib, 'Gi').string
    : t('Unlimited');

  return (
    <Modal isOpen={isOpen} onClose={closeModal} variant={ModalVariant.medium}>
      <ModalTitle>{t('Generate token')}</ModalTitle>
      {token ? (
        <ModalBody>
          <TokenViewBody
            token={token}
            tokenGenerationTimestamp={tokenGenerationTimestamp}
          />
        </ModalBody>
      ) : (
        <>
          <ModalBody>
            <p className="odf-onboarding-modal__title-desc">
              {t(
                `An onboarding token to authenticate and authorize an OpenShift cluster, granting access to the Data Foundation deployment, thus establishing a secure connection.`
              )}
            </p>
            <Flex direction={{ default: 'column' }}>
              <FlexItem>
                <span className="odf-onboarding-modal__quota-desc">
                  <Title headingLevel="h5" size="md">
                    {t('StorageConsumer')}:{' '}
                  </Title>
                  {storageConsumer.metadata.name}
                </span>
              </FlexItem>
              <FlexItem>
                <span className="odf-onboarding-modal__quota-desc">
                  <Title headingLevel="h5" size="md">
                    {t('Storage quota')}:{' '}
                  </Title>
                  {storageQuota}
                </span>
              </FlexItem>
            </Flex>
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
        className="pf-v6-u-font-size-md odf-onboarding-modal__quota-desc"
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
          className="pf-v6-u-mt-lg"
          isChecked={!isUnlimitedQuota(quota)}
          isDisabled={initialQuota && isUnlimitedQuota(initialQuota)}
          onChange={() => {
            setQuota({ ...(initialQuota || defaultCustomQuota) });
          }}
        />
      </FormGroup>
      {!isUnlimitedQuota(quota) && (
        <div className="pf-v6-u-ml-lg pf-v6-u-mt-md">
          <span className="pf-v6-u-font-weight-bold">
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
  tokenGenerationTimestamp: string;
};

const TokenViewBody: React.FC<TokenViewBodyProps> = ({
  token,
  tokenGenerationTimestamp,
}) => {
  const { t } = useCustomTranslation();

  const onCopyToClipboard = () => {
    navigator.clipboard.writeText(token);
  };

  return (
    <Flex direction={{ default: 'column' }}>
      <FlexItem>
        <Level>
          <LevelItem className="pf-v6-u-font-weight-bold">
            {t('Onboarding token')}
            <FieldLevelHelp position="right">
              {onboardingTokenTooltip(t)}
            </FieldLevelHelp>
          </LevelItem>
          <LevelItem>
            <span className="pf-v6-u-font-size-sm pf-v6-u-color-200">
              {t('Generated on')}: {tokenGenerationTimestamp}
            </span>
            <span className="pf-v6-u-ml-sm odf-onboarding-modal__timestamp-icon">
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
      <FlexItem className="pf-v6-u-mb-lg">
        <Trans t={t} ns="plugin__odf-console">
          On an OpenShift cluster, deploy the Data Foundation client operator
          using the generated token.
        </Trans>
      </FlexItem>
      <FlexItem>
        <Button
          icon={<CopyIcon className="pf-v6-u-ml-md pf-v6-u-mr-sm" />}
          type="button"
          onClick={onCopyToClipboard}
          variant={ButtonVariant.primary}
          className="odf-onboarding-modal__clipboard"
        >
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
