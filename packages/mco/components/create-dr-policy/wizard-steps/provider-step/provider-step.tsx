import * as React from 'react';
import {
  DRPolicyKind,
  ManagedClusterInfoType,
  MirrorPeerKind,
} from '@odf/mco/types';
import { StorageVendorId } from '@odf/mco/utils/storage-vendor-registry';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Content,
  ContentVariants,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Title,
} from '@patternfly/react-core';
import { DRPolicyAction } from '../../utils/reducer';
import { SelectStorageProvider } from './select-storage-provider';

type ProviderStepProps = {
  selectedClusters: ManagedClusterInfoType[];
  selectedVendor?: StorageVendorId;
  mirrorPeers: MirrorPeerKind[];
  drPolicies: DRPolicyKind[];
  dispatch: React.Dispatch<DRPolicyAction>;
  onProviderChange?: () => void;
};

export const ProviderStep: React.FC<ProviderStepProps> = ({
  selectedClusters,
  selectedVendor,
  mirrorPeers,
  drPolicies,
  dispatch,
  onProviderChange,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Form className="mco-create-data-policy__body">
      <Title headingLevel="h2" size="lg" className="pf-v6-u-mb-md">
        {t('Storage provider')}
      </Title>
      <Content className="pf-v6-u-mb-lg">
        <Content component={ContentVariants.small}>
          {t(
            'Choose the storage system that will be used for disaster recovery replication.'
          )}
        </Content>
      </Content>
      <FormGroup fieldId="select-provider" className="pf-v6-u-mb-lg">
        <FormHelperText>
          <HelperText className="mco-create-data-policy__text-input">
            <HelperTextItem>
              {t(
                'Providers detected on both clusters are available, along with generic third-party storage.'
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
        <SelectStorageProvider
          selectedClusters={selectedClusters}
          selectedVendor={selectedVendor}
          mirrorPeers={mirrorPeers}
          drPolicies={drPolicies}
          dispatch={dispatch}
          onProviderChange={onProviderChange}
        />
      </FormGroup>
    </Form>
  );
};
