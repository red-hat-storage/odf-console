import * as React from 'react';
import { LoadError, LoadingBox } from '@odf/shared';
import { useWatchStorageSystems } from '@odf/shared/hooks/useWatchStorageSystems';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as _ from 'lodash-es';
import { StorageSystemListPage } from '../system-list/external-systems-list';
import InitialEmptyStatePage from './InitialEmptyStatePage';

const ExternalSystemsListPage: React.FC = () => {
  const { t } = useCustomTranslation();
  const [externalClusters, loaded, loadError] = useWatchStorageSystems(true);
  const hasExternalClusters = externalClusters?.length > 0;

  if (!loaded) {
    return <LoadingBox />;
  }

  return (
    <>
      {loaded && loadError && (
        <LoadError message={loadError} label={t('External Systems')} />
      )}
      {loaded &&
        !loadError &&
        (hasExternalClusters ? (
          <StorageSystemListPage />
        ) : (
          <InitialEmptyStatePage />
        ))}
    </>
  );
};

export default ExternalSystemsListPage;
