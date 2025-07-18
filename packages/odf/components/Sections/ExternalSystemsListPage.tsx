import * as React from 'react';
import { StorageSystemListPage } from '../system-list/odf-system-list';
import InitialEmptyStatePage from './InitialEmptyStatePage';

const ExternalSystemsListPage: React.FC = () => {
  const isExternalSystemPresent = true;

  return (
    <>
      {isExternalSystemPresent ? (
        <StorageSystemListPage />
      ) : (
        <InitialEmptyStatePage />
      )}
    </>
  );
};

export default ExternalSystemsListPage;
