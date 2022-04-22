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
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router';
import { NooBaaBucketClassModel } from '../../models';
import { BucketClassKind } from '../../types';
import { CommonDetails, DetailsItem } from './CommonDetails';

type BucketClassDetailsPageProps = {
  match: RouteComponentProps<{ resourceName: string; plural: string }>['match'];
};

type DetailsProps = {
  obj: BucketClassKind;
};

type DetailsType = (launchModal: any, t) => React.FC<DetailsProps>;

type PolicyDetailsProps = {
  resource: BucketClassKind;
};

const PlacementPolicyDetails: React.FC<PolicyDetailsProps> = ({ resource }) => {
  const { t } = useTranslation();
  const tiers = resource.spec.placementPolicy.tiers;
  return (
    <>
      <DetailsItem field={t('Tiers')} padChildElement showBorder>
        {tiers.map((tier) => (
          <DetailsItem
            field={t('Placement')}
            key={`${tier.placement}-placement`}
            showBorder
          >
            {tier.placement || 'Spread'}
          </DetailsItem>
        ))}
      </DetailsItem>
    </>
  );
};

const NamespacePolicyDetails: React.FC<PolicyDetailsProps> = ({ resource }) => {
  const { t } = useTranslation();
  const type = resource.spec.namespacePolicy.type;
  return <DetailsItem field={t('Policy type')}>{type}</DetailsItem>;
};

const BCDetails: DetailsType =
  (launchModal, t) =>
  // eslint-disable-next-line react/display-name
  ({ obj }) => {
    const isPlacementPolicyType = obj.spec.hasOwnProperty('placementPolicy');

    const title = isPlacementPolicyType
      ? t('Placement Policy')
      : t('Namespace Policy');
    return (
      <CommonDetails
        resource={obj}
        launchModal={launchModal}
        resourceModel={NooBaaBucketClassModel}
      >
        <SectionHeading text={title} />
        <div className="row">
          <div className="col-sm-6">
            {isPlacementPolicyType ? (
              <PlacementPolicyDetails resource={obj} />
            ) : (
              <NamespacePolicyDetails resource={obj} />
            )}
          </div>
        </div>
      </CommonDetails>
    );
  };

type YAMLEditorWrapped = {
  obj?: BucketClassKind;
};

const YAMLEditorWrapped: React.FC<YAMLEditorWrapped> = ({ obj }) => (
  <ResourceYAMLEditor initialResource={obj} />
);

const BucketClassDetailsPage: React.FC<BucketClassDetailsPageProps> = ({
  match,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const { resourceName: name } = match.params;
  const [resource, loaded, loadError] = useK8sWatchResource<BucketClassKind>({
    kind: referenceForModel(NooBaaBucketClassModel),
    name,
    namespace: CEPH_STORAGE_NAMESPACE,
    isList: false,
  });

  const [Modal, modalProps, launchModal] = useModalLauncher();

  const breadcrumbs = [
    {
      name: t('OpenShift Data Foundation'),
      path: '/odf/overview',
    },
    {
      name: t('BucketClasses'),
      path: '/odf/resource/noobaa.io~v1alpha1~BucketClass',
    },
    {
      name: t('BucketClass details'),
      path: '',
    },
  ];

  const Details = React.useMemo(
    () => BCDetails(launchModal, t),
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
          resourceModel: NooBaaBucketClassModel,
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
        resourceModel={NooBaaBucketClassModel}
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

export default BucketClassDetailsPage;
