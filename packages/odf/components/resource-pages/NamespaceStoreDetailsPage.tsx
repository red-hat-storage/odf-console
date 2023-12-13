import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import DetailsPage from '@odf/shared/details-page/DetailsPage';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { Kebab } from '@odf/shared/kebab/kebab';
import { useModalLauncher } from '@odf/shared/modals/modalLauncher';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { EventStreamWrapped, YAMLEditorWrapped } from '@odf/shared/utils/Tabs';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { useParams } from 'react-router-dom-v5-compat';
import { NooBaaNamespaceStoreModel } from '../../models';
import { NamespaceStoreKind } from '../../types';
import { CommonDetails } from './CommonDetails';
import ProviderDetails from './Providers';

type DetailsProps = {
  obj: NamespaceStoreKind;
};

type DetailsType = (launchModal: any, t) => React.FC<DetailsProps>;

const NSDetails: DetailsType =
  (launchModal, t) =>
  // eslint-disable-next-line react/display-name
  ({ obj }) => {
    return (
      <CommonDetails
        resource={obj}
        launchModal={launchModal}
        resourceModel={NooBaaNamespaceStoreModel}
      >
        <SectionHeading text={t('Provider details')} />
        <div className="row">
          <div className="col-sm-6">
            <ProviderDetails resource={obj} />
          </div>
        </div>
      </CommonDetails>
    );
  };

const NamespaceStoreDetailsPage: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { resourceName: name } = useParams();
  const [resource, loaded, loadError] = useK8sWatchResource<NamespaceStoreKind>(
    {
      kind: referenceForModel(NooBaaNamespaceStoreModel),
      name,
      namespace: CEPH_STORAGE_NAMESPACE,
      isList: false,
    }
  );

  const [Modal, modalProps, launchModal] = useModalLauncher();

  const breadcrumbs = [
    {
      name: t('Object Storage'),
      path: '/odf/object-storage',
    },
    {
      name: t('NamespaceStores'),
      path: '/odf/object-storage/noobaa.io~v1alpha1~NamespaceStore',
    },
    {
      name: t('NamespaceStore details'),
      path: '',
    },
  ];

  const Details = React.useMemo(
    () => NSDetails(launchModal, t),
    [launchModal, t]
  );

  const memoizedResource = useDeepCompareMemoize(resource, true);

  const actions = React.useCallback(() => {
    return (
      <Kebab
        toggleType="Dropdown"
        launchModal={launchModal}
        extraProps={{
          resource: memoizedResource,
          resourceModel: NooBaaNamespaceStoreModel,
        }}
      />
    );
  }, [launchModal, memoizedResource]);

  return (
    <>
      <Modal {...modalProps} />
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
            component: Details as any,
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
