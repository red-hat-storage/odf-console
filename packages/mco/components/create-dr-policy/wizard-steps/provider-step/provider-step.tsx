import * as React from 'react';
import { StorageVendorId } from '@odf/mco/constants';
import {
  DRPolicyKind,
  ManagedClusterInfoType,
  MirrorPeerKind,
} from '@odf/mco/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Content, Form, FormGroup, Title } from '@patternfly/react-core';
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
      <div>
        <Title headingLevel="h2" size="lg" className="pf-v6-u-mb-sm">
          {t('Storage provider')}
        </Title>
        <Content component="p" className="pf-v6-u-font-size-md">
          {t(
            'Choose the storage system that will be used for disaster recovery replication. Only storage providers configured on both clusters will be available.'
          )}
        </Content>
      </div>
      <FormGroup fieldId="select-provider">
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
