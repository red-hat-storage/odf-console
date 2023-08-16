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
import { NooBaaBucketClassModel } from '../../models';
import { BucketClassKind } from '../../types';
import { CommonDetails, DetailsItem } from './CommonDetails';

type BucketClassDetailsPageProps = {
  match: RouteComponentProps<{ resourceName: string; plural: string }>['match'];
};

type DetailsProps = {
  obj: BucketClassKind;
} & RouteComponentProps;

type PolicyDetailsProps = {
  resource: BucketClassKind;
};

const PlacementPolicyDetails: React.FC<PolicyDetailsProps> = ({ resource }) => {
  const { t } = useCustomTranslation();
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
  const { t } = useCustomTranslation();
  const type = resource.spec.namespacePolicy.type;
  return <DetailsItem field={t('Policy type')}>{type}</DetailsItem>;
};

const BCDetails: React.FC<DetailsProps> = ({ obj }) => {
  const { t } = useCustomTranslation();
  const isPlacementPolicyType = obj.spec.hasOwnProperty('placementPolicy');

  const title = isPlacementPolicyType
    ? t('Placement Policy')
    : t('Namespace Policy');
  return (
    <CommonDetails resource={obj} resourceModel={NooBaaBucketClassModel}>
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

const BucketClassDetailsPage: React.FC<BucketClassDetailsPageProps> = ({
  match,
}) => {
  const { t } = useCustomTranslation();
  const { resourceName: name } = match.params;
  const [resource, loaded, loadError] = useK8sWatchResource<BucketClassKind>({
    kind: referenceForModel(NooBaaBucketClassModel),
    name,
    namespace: CEPH_STORAGE_NAMESPACE,
    isList: false,
  });

  const breadcrumbs = [
    {
      name: t('Object Service'),
      path: '/odf/object-storage',
    },
    {
      name: t('BucketClasses'),
      path: '/odf/object-storage/resource/noobaa.io~v1alpha1~BucketClass',
    },
    {
      name: t('BucketClass details'),
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
          resourceModel: NooBaaBucketClassModel,
        }}
        customKebabItems={[
          {
            key: 'EDIT_BC_RESOURCES',
            value: t('Edit Bucket Class Resources'),
            component: React.lazy(
              () => import('../bucket-class/modals/edit-backingstore-modal')
            ),
          },
        ]}
      />
    );
  }, [memoizedResource, t]);

  return (
    <>
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
            component: BCDetails,
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

export default BucketClassDetailsPage;
