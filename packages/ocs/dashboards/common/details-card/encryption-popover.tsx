import * as React from 'react';
import { KMSConfigMapName, KmsProviderNames } from '@odf/core/constants';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { KmsImplementations } from '@odf/core/types';
import {
  ConfigMapKind,
  ConfigMapModel,
  GreenCheckCircleIcon,
  RedTimesIcon,
} from '@odf/shared';
import { StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import {
  Button,
  Popover,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Divider,
  ButtonVariant,
} from '@patternfly/react-core';

type EncryptionPopoverProps = {
  cluster?: StorageClusterKind;
  isObjectDashboard?: boolean;
};

const StatusIcon: React.FC<{ enabled: boolean }> = ({ enabled }) =>
  enabled ? <GreenCheckCircleIcon /> : <RedTimesIcon />;

const getKmsTypeDescription = (encryptionKMSType: string, t: TFunction) => {
  let provider = '';

  switch (encryptionKMSType) {
    case KmsImplementations.VAULT:
    case KmsImplementations.VAULT_TENANT_SA:
    case KmsImplementations.VAULT_TOKENS:
      provider = KmsProviderNames.VAULT;
      break;
    case KmsImplementations.IBM_KEY_PROTECT:
      provider = KmsProviderNames.HPCS;
      break;
    case KmsImplementations.KMIP:
      provider = KmsProviderNames.THALES;
      break;
    case KmsImplementations.AZURE:
      provider = KmsProviderNames.AZURE;
      break;
    default:
      return '';
  }

  return !!provider
    ? t('External Key Management Service: {{ provider }}', { provider })
    : '';
};

const renderEncryptionDetails = (
  t: TFunction,
  kmsTypeDescription: string,
  cluster: StorageClusterKind,
  isObjectDashboard: boolean
) => {
  const encryption = cluster?.spec?.encryption;
  const isStorageClassEncrypted = encryption?.storageClass;
  const inTransitEncryption =
    cluster?.spec?.network?.connections?.encryption?.enabled;

  return (
    <>
      {isObjectDashboard ? (
        <>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <Content component={ContentVariants.h6}>
                {t('Object storage')}
              </Content>
            </FlexItem>
            <FlexItem align={{ default: 'alignRight' }}>
              <StatusIcon enabled={true} />
            </FlexItem>
          </Flex>
          <Content component="p">
            {t('Data encryption for object storage.')}
            {kmsTypeDescription && (
              <Content component={ContentVariants.small}>
                {kmsTypeDescription}
              </Content>
            )}
          </Content>
        </>
      ) : (
        <>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <Content component={ContentVariants.h6}>
                {t('Cluster-wide encryption')}
              </Content>
            </FlexItem>
            <FlexItem align={{ default: 'alignRight' }}>
              <StatusIcon enabled={encryption?.clusterWide} />
            </FlexItem>
          </Flex>
          <Content component="p">
            {t('Encryption for the entire cluster (block and file)')}
            <br />
            {kmsTypeDescription && (
              <Content component={ContentVariants.small}>
                {kmsTypeDescription}
              </Content>
            )}
          </Content>

          {isStorageClassEncrypted && (
            <>
              <Divider />
              <Content component={ContentVariants.h6}>
                {t('Storage class encryption')}
              </Content>
              <Content component="p">
                {t('Encryption for PVs')}
                {kmsTypeDescription && (
                  <Content component={ContentVariants.small}>
                    {kmsTypeDescription}
                  </Content>
                )}
              </Content>

              <Flex alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <Content component={ContentVariants.h6}>
                    {t('Block storage')}
                  </Content>
                </FlexItem>
                <FlexItem align={{ default: 'alignRight' }}>
                  <StatusIcon enabled={isStorageClassEncrypted} />
                </FlexItem>
              </Flex>
              <Content component="p">
                {t('Data encryption for block storage.')}
              </Content>
              <Content
                component={ContentVariants.small}
                className="pf-v6-u-mt-md"
              >
                {t(
                  'This status is shown exclusively for default storage classes.'
                )}
              </Content>
            </>
          )}
        </>
      )}

      <Divider />

      <Flex alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <Content component={ContentVariants.h6}>
            {t('In-transit encryption')}
          </Content>
        </FlexItem>
        <FlexItem align={{ default: 'alignRight' }}>
          <StatusIcon enabled={inTransitEncryption} />
        </FlexItem>
      </Flex>
      <Content component="p">
        {t('Encryption for all data passing over the network')}
      </Content>
    </>
  );
};

const EncryptionPopover: React.FC<EncryptionPopoverProps> = ({
  cluster,
  isObjectDashboard,
}) => {
  const { t } = useCustomTranslation();
  const { odfNamespace } = useODFNamespaceSelector();

  const [configMapData, configLoaded, configLoadError] =
    useK8sWatchResource<ConfigMapKind>({
      kind: ConfigMapModel.kind,
      name: KMSConfigMapName,
      namespace: odfNamespace,
      isList: false,
    });

  const kmsTypeDescription = React.useMemo(() => {
    if (configLoaded && !configLoadError && configMapData?.data) {
      const kmsProvider = configMapData.data.KMS_PROVIDER;
      return kmsProvider ? getKmsTypeDescription(kmsProvider, t) : '';
    }

    return '';
  }, [configLoaded, configLoadError, configMapData, t]);

  return (
    <Popover
      aria-label={t('Encryption summary popover')}
      headerContent={<div>{t('Encryption Summary')}</div>}
      bodyContent={renderEncryptionDetails(
        t,
        kmsTypeDescription,
        cluster,
        isObjectDashboard
      )}
    >
      <Button variant={ButtonVariant.link} isInline>
        {isObjectDashboard ||
        cluster?.spec?.encryption?.storageClass ||
        cluster?.spec?.network?.connections?.encryption?.enabled ||
        cluster?.spec?.encryption?.clusterWide
          ? t('Enabled')
          : t('Not enabled')}
      </Button>
    </Popover>
  );
};

export default EncryptionPopover;
