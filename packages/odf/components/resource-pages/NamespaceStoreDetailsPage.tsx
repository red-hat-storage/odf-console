import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import DetailsPage from '@odf/shared/details-page/DetailsPage';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { Kebab } from '@odf/shared/kebab/kebab';
import { useModalLauncher } from '@odf/shared/modals/modalLauncher';
import { referenceForModel } from '@odf/shared/utils';
import {
  ResourceYAMLEditor,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
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

type YAMLEditorWrapped = {
  obj?: NamespaceStoreKind;
};

const YAMLEditorWrapped: React.FC<YAMLEditorWrapped> = ({ obj }) => (
  <ResourceYAMLEditor initialResource={obj} />
);

const NamespaceStoreDetailsPage: React.FC<BackingStoreDetilsPageProps> = ({
  match,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const { resourceName: name } = match.params;
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
      name: t('OpenShift Data Foundation'),
      path: '/odf/overview',
    },
    {
      name: t('NamespaceStores'),
      path: '/odf/resource/noobaa.io~v1alpha1~NamespaceStore',
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
        ]}
      />
    </>
  );
};

export default NamespaceStoreDetailsPage;
