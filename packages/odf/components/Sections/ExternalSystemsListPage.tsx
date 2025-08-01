import * as React from 'react';
import { useWatchStorageSystems } from '@odf/shared/hooks/useWatchStorageSystems';
import { StorageSystemListPage } from '../system-list/external-systems-list';
import InitialEmptyStatePage from './InitialEmptyStatePage';

const ExternalSystemsListPage: React.FC = () => {
  const [externalClusters] = useWatchStorageSystems(true);
  const hasExternalClusters = externalClusters?.length > 0;

  return (
    <>
      {hasExternalClusters ? (
        <StorageSystemListPage />
      ) : (
        <InitialEmptyStatePage />
      )}
    </>
  );
};

export default ExternalSystemsListPage;
