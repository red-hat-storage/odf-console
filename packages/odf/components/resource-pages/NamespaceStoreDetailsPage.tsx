import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import DetailsPage from '@odf/shared/details-page/DetailsPage';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { Kebab } from '@odf/shared/kebab/kebab';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { EventStreamWrapped, YAMLEditorWrapped } from '@odf/shared/utils/Tabs';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { RouteComponentProps } from 'react-router';
import { NooBaaNamespaceStoreModel } from '../../models';
import { NamespaceStoreKind } from '../../types';
import { CommonDetails } from './CommonDetails';
import ProviderDetails from './Providers';

type BackingStoreDetilsPageProps = {
  match: RouteComponentProps<{ resourceName: string; plural: string }>['match'];
};

type DetailsProps = {
  obj: NamespaceStoreKind;
} & RouteComponentProps;

const NSDetails: React.FC<DetailsProps> = ({ obj }) => {
  const { t } = useCustomTranslation();
  return (
    <CommonDetails resource={obj} resourceModel={NooBaaNamespaceStoreModel}>
      <SectionHeading text={t('Provider details')} />
      <div className="row">
        <div className="col-sm-6">
          <ProviderDetails resource={obj} />
        </div>
      </div>
    </CommonDetails>
  );
};

const NamespaceStoreDetailsPage: React.FC<BackingStoreDetilsPageProps> = ({
  match,
}) => {
  const { t } = useCustomTranslation();
  const { resourceName: name } = match.params;
  const [resource, loaded, loadError] = useK8sWatchResource<NamespaceStoreKind>(
    {
      kind: referenceForModel(NooBaaNamespaceStoreModel),
      name,
      namespace: CEPH_STORAGE_NAMESPACE,
      isList: false,
    }
  );

  const breadcrumbs = [
    {
      name: t('Object Service'),
      path: '/odf/object-storage',
    },
    {
      name: t('NamespaceStores'),
      path: '/odf/object-storage/resource/noobaa.io~v1alpha1~NamespaceStore',
    },
    {
      name: t('NamespaceStore details'),
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
          resourceModel: NooBaaNamespaceStoreModel,
        }}
      />
    );
  }, [memoizedResource]);

  return (
    <>
      <DetailsPage
        loaded={loaded}
        loadError={loadError}
        breadcrumbs={breadcrumbs}
        actions={actions}
        resourceModel={NooBaaNamespaceStoreModel}
        resource={resource}
        pages={[
          {
            href: '',
            name: 'Details',
            component: NSDetails,
          },
          {
            href: 'yaml',
            name: 'YAML',
            component: YAMLEditorWrapped,
          },
          {
            href: 'events',
            name: 'Events',
            component: EventStreamWrapped,
          },
        ]}
      />
    </>
  );
};

export default NamespaceStoreDetailsPage;
