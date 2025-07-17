import * as React from 'react';
import { useWatchStorageSystems } from '@odf/shared/hooks/useWatchStorageSystems';
import { isOCSStorageSystem } from '@odf/shared/utils';
import ObjectServicePage from '../object-service-nav-item/object-service';
import InitialEmptyStatePage from './InitialEmptyStatePage';

const ObjectStorageSection: React.FC = () => {
  const [storageSystems] = useWatchStorageSystems();

  const filteredStorageSystems = storageSystems?.filter(isOCSStorageSystem);

  const noStorageSystems = filteredStorageSystems.length === 0;
  return noStorageSystems ? <InitialEmptyStatePage /> : <ObjectServicePage />;
};

export default ObjectStorageSection;
