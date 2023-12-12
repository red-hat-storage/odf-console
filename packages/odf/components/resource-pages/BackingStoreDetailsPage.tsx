import * as React from 'react';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import { useODFNamespaceSelector } from '@odf/core/redux';
import DetailsPage from '@odf/shared/details-page/DetailsPage';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { Kebab } from '@odf/shared/kebab/kebab';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { EventStreamWrapped, YAMLEditorWrapped } from '@odf/shared/utils/Tabs';
import { useParams } from 'react-router-dom-v5-compat';
import { NooBaaBackingStoreModel } from '../../models';
import { BackingStoreKind } from '../../types';
import { CommonDetails } from './CommonDetails';
import ProviderDetails from './Providers';

type DetailsProps = {
  obj: BackingStoreKind;
};

const BSDetails: React.FC<DetailsProps> = ({ obj }) => {
  const { t } = useCustomTranslation();
  return (
    <CommonDetails resourceModel={NooBaaBackingStoreModel} resource={obj}>
      <SectionHeading text={t('Provider details')} />
      <div className="row">
        <div className="col-sm-6">
          <ProviderDetails resource={obj} />
        </div>
      </div>
    </CommonDetails>
  );
};

const BackingStoreDetailsPage: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { resourceName: name } = useParams();

  const { isODFNsLoaded, odfNsLoadError } = useODFNamespaceSelector();

  const [resource, loaded, loadError] =
    useSafeK8sWatchResource<K8sResourceKind>((ns: string) => ({
      kind: referenceForModel(NooBaaBackingStoreModel),
      name,
      namespace: ns,
      isList: false,
    }));

  const breadcrumbs = [
    {
      name: t('Object Storage'),
      path: '/odf/object-storage',
    },
    {
      name: t('BackingStores'),
      path: '/odf/object-storage/noobaa.io~v1alpha1~BackingStore',
    },
    {
      name: t('BackingStore details'),
      path: '',
    },
  ];

  const memoizedResource = useDeepCompareMemoize(resource, true);

  const actions = React.useCallback(() => {
    return (
      <Kebab
        toggleType="Dropdown"
        extraProps={{
          resource: memoizedResource,
          resourceModel: NooBaaBackingStoreModel,
        }}
      />
    );
  }, [memoizedResource]);

  return (
    <>
      <DetailsPage
        loaded={loaded && isODFNsLoaded}
        loadError={loadError || odfNsLoadError}
        breadcrumbs={breadcrumbs}
        actions={actions}
        resourceModel={NooBaaBackingStoreModel}
        resource={resource}
        pages={[
          {
            href: '',
            name: t('Details'),
            component: BSDetails as any,
          },
          {
            href: 'yaml',
            name: t('YAML'),
            component: YAMLEditorWrapped,
          },
          {
            href: 'events',
            name: t('Events'),
            component: EventStreamWrapped,
          },
        ]}
      />
    </>
  );
};

export default BackingStoreDetailsPage;
