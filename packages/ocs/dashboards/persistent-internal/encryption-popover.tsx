import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { KmsImplementations } from '@odf/core/types';
import { ConfigMapKind, ConfigMapModel } from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import {
  Button,
  Popover,
  Text,
  TextContent,
  TextVariants,
  Flex,
  FlexItem,
  Divider,
} from '@patternfly/react-core';
import { CheckCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';

type EncryptionPopoverProps = {
  encryptionDetails: {
    clusterWide?: boolean;
    kms?: { enable: boolean };
    storageClass?: boolean;
  };
  inTransitEncryption: boolean;
  hasStorageClassEncryption: boolean;
  hasMCGEncryption: boolean;
};

// React Component for rendering encryption status with icons
const StatusIcon: React.FC<{ enabled: boolean }> = ({ enabled }) =>
  enabled ? (
    <CheckCircleIcon color="var(--pf-global--success-color--100)" />
  ) : (
    <TimesCircleIcon color="var(--pf-global--danger-color--100)" />
  );

// Utility function to get KMS type description from kmsConfig
const getKmsTypeDescription = (encryptionKMSType: string, t: TFunction) => {
  switch (encryptionKMSType) {
    case KmsImplementations.VAULT_TENANT_SA:
      return t('External Key Management Service: Vault');
    case KmsImplementations.IBM_KEY_PROTECT:
      return t(
        'External Key Management Service: Hyper Protect Crypto Services'
      );
    case KmsImplementations.KMIP:
      return t(
        'External Key Management Service: Thales CipherTrust Manager (using KMIP)'
      );
    case KmsImplementations.AZURE:
      return t('External Key Management Service: Azure Key Vault');
    default:
      return '';
  }
};

const renderEncryptionDetails = (
  t: TFunction,
  kmsTypeDescription: string,
  encryptionDetails: EncryptionPopoverProps['encryptionDetails'],
  hasStorageClassEncryption: boolean,
  hasMCGEncryption: boolean,
  isKmsEnabled: boolean,
  inTransitEncryption: boolean
) => {
  return (
    <TextContent>
      {hasMCGEncryption ? (
        <>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <Text component={TextVariants.h6}>{t('Object storage')}</Text>
            </FlexItem>
            <FlexItem align={{ default: 'alignRight' }}>
              <StatusIcon enabled={hasMCGEncryption} />
            </FlexItem>
          </Flex>
          <Text>
            {t('Data encryption for object storage.')}
            {kmsTypeDescription && (
              <Text component={TextVariants.small}>{kmsTypeDescription}</Text>
            )}
          </Text>
        </>
      ) : (
        <>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <Text component={TextVariants.h6}>
                {t('Cluster-wide encryption')}
              </Text>
            </FlexItem>
            <FlexItem align={{ default: 'alignRight' }}>
              <StatusIcon enabled={encryptionDetails.clusterWide} />
            </FlexItem>
          </Flex>
          <Text>
            {t('Encryption for the entire cluster (block and file)')}
            <br />
            {kmsTypeDescription && (
              <Text component={TextVariants.small}>{kmsTypeDescription}</Text>
            )}
          </Text>

          {hasStorageClassEncryption && (
            <>
              <Divider />
              <Text component={TextVariants.h6}>
                {t('Storage class encryption')}
              </Text>
              <Text>
                {t('Encryption for PVs')}
                {kmsTypeDescription && (
                  <Text component={TextVariants.small}>
                    {kmsTypeDescription}
                  </Text>
                )}
              </Text>

              <Flex alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <Text component={TextVariants.h6}>{t('Block storage')}</Text>
                </FlexItem>
                <FlexItem align={{ default: 'alignRight' }}>
                  <StatusIcon
                    enabled={isKmsEnabled && hasStorageClassEncryption}
                  />
                </FlexItem>
              </Flex>
              <Text>{t('Data encryption for block storage.')}</Text>

              <Flex alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <Text component={TextVariants.h6}>{t('File storage')}</Text>
                </FlexItem>
                <FlexItem align={{ default: 'alignRight' }}>
                  <StatusIcon enabled={encryptionDetails.clusterWide} />
                </FlexItem>
              </Flex>
              <Text>
                {t('Data encryption for file storage.')}
                <Text component={TextVariants.small}>
                  {t(
                    'This status is shown exclusively for default storage classes.'
                  )}
                </Text>
              </Text>
            </>
          )}
        </>
      )}

      <Divider />

      <Flex alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <Text component={TextVariants.h6}>{t('In-transit encryption')}</Text>
        </FlexItem>
        <FlexItem align={{ default: 'alignRight' }}>
          <StatusIcon enabled={inTransitEncryption} />
        </FlexItem>
      </Flex>
      <Text>{t('Encryption for all data passing over the network')}</Text>
    </TextContent>
  );
};

const EncryptionPopover: React.FC<EncryptionPopoverProps> = ({
  encryptionDetails,
  inTransitEncryption,
  hasStorageClassEncryption,
  hasMCGEncryption,
}) => {
  const { t } = useCustomTranslation();
  const [kmsTypeDescription, setKmsTypeDescription] =
    React.useState<string>('');

  const isKmsEnabled = encryptionDetails.kms?.enable;
  const { odfNamespace } = useODFNamespaceSelector();

  // Watching the ConfigMap using useK8sWatchResource
  const [configMapData, configLoaded, configLoadError] =
    useK8sWatchResource<ConfigMapKind>({
      kind: ConfigMapModel.kind,
      name: 'csi-kms-connection-details',
      namespace: odfNamespace,
      isList: false,
    });

  React.useEffect(() => {
    if (
      configLoaded &&
      !configLoadError &&
      configMapData?.data?.test &&
      isKmsEnabled
    ) {
      const kmsData = JSON.parse(configMapData.data.test || '{}');
      if (kmsData?.encryptionKMSType) {
        setKmsTypeDescription(
          getKmsTypeDescription(kmsData.encryptionKMSType, t)
        );
      }
    }
  }, [configLoaded, configLoadError, configMapData, isKmsEnabled, t]);

  return (
    <Popover
      aria-label={t('Encryption summary popover')}
      headerContent={<div>{t('Encryption Summary')}</div>}
      bodyContent={renderEncryptionDetails(
        t,
        kmsTypeDescription,
        encryptionDetails,
        hasStorageClassEncryption,
        hasMCGEncryption,
        isKmsEnabled,
        inTransitEncryption
      )}
    >
      <Button variant="link" isInline>
        {isKmsEnabled ||
        hasMCGEncryption ||
        hasStorageClassEncryption ||
        inTransitEncryption ||
        encryptionDetails.clusterWide
          ? t('Enabled')
          : t('Not enabled')}
      </Button>
    </Popover>
  );
};

export default EncryptionPopover;
