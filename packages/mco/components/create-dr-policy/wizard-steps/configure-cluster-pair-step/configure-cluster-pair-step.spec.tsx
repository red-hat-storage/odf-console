import * as React from 'react';
import { StorageVendorId } from '@odf/mco/constants';
import { ManagedClusterInfoType } from '@odf/mco/types';
import { render, screen } from '@testing-library/react';
import { drPolicyInitialState } from '../../utils/reducer';
import { ConfigureClusterPairStep } from './configure-cluster-pair-step';

const clusters = ['east-1', 'west-1'].map(
  (name) => ({ metadata: { name } }) as ManagedClusterInfoType
);

const renderStep = (storageVendor: StorageVendorId) =>
  render(
    <ConfigureClusterPairStep
      storageVendor={storageVendor}
      selectedClusters={clusters}
      cluster1S3Details={drPolicyInitialState.configure.cluster1S3Details}
      cluster2S3Details={drPolicyInitialState.configure.cluster2S3Details}
      useSameS3Connection={false}
      dispatch={jest.fn()}
      clustersWithS3Configuration={new Set()}
      prePairCheckResults={{}}
      acknowledgedChecks={new Set()}
      onAcknowledgeCheck={jest.fn()}
    />
  );

describe('ConfigureClusterPairStep', () => {
  it('warns about third-party storage for other storage providers', () => {
    renderStep(StorageVendorId.Generic);
    expect(screen.getByText('Third-party provisioner')).toBeInTheDocument();
  });

  it('does not warn about third-party storage for IBM Storage Scale', () => {
    renderStep(StorageVendorId.IbmStorageScale);
    expect(
      screen.queryByText('Third-party provisioner')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Replication site')).toBeInTheDocument();
  });
});
