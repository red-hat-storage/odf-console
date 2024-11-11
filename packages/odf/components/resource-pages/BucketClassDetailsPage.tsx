import * as React from 'react';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import { useODFNamespaceSelector } from '@odf/core/redux';
import DetailsPage from '@odf/shared/details-page/DetailsPage';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { Kebab } from '@odf/shared/kebab/kebab';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { EventStreamWrapped, YAMLEditorWrapped } from '@odf/shared/utils/Tabs';
import { useParams } from 'react-router-dom-v5-compat';
import { NooBaaBucketClassModel } from '../../models';
import { BucketClassKind } from '../../types';
import { CommonDetails, DetailsItem } from './CommonDetails';

type DetailsProps = {
  obj: BucketClassKind;
};

type PolicyDetailsProps = {
  resource: BucketClassKind;
};

const PlacementPolicyDetails: React.FC<PolicyDetailsProps> = ({ resource }) => {
  const { t } = useCustomTranslation();
  const tiers = resource.spec.placementPolicy.tiers;
  return (
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

const BucketClassDetailsPage: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { resourceName: name } = useParams();

  const { isODFNsLoaded, odfNsLoadError } = useODFNamespaceSelector();

  const [resource, loaded, loadError] =
    useSafeK8sWatchResource<BucketClassKind>((ns: string) => ({
      kind: referenceForModel(NooBaaBucketClassModel),
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
      name: t('BucketClasses'),
      path: '/odf/object-storage/noobaa.io~v1alpha1~BucketClass',
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
    <DetailsPage
      loaded={loaded && isODFNsLoaded}
      loadError={loadError || odfNsLoadError}
      breadcrumbs={breadcrumbs}
      actions={actions}
      resourceModel={NooBaaBucketClassModel}
      resource={resource}
      pages={[
        {
          href: '',
          name: t('Details'),
          component: BCDetails as any,
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
  );
};

export default BucketClassDetailsPage;
