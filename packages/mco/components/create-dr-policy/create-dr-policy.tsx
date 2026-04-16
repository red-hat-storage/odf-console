import * as React from 'react';
import { DRPolicyModel } from '@odf/shared';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { Content, ContentVariants } from '@patternfly/react-core';
import '../../style.scss';
import './create-dr-policy.scss';
import { CreateDRPolicyForm } from './CreateDRPolicyForm';

const getDRPolicyListPageLink = (url: string) =>
  url.replace(`/${referenceForModel(DRPolicyModel)}/~new`, '');

const CreateDRPolicy: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { pathname: url, search } = useLocation();
  const navigate = useNavigate();

  // Extract pre-selected clusters from URL params (e.g., ?cluster1=X&cluster2=Y)
  const preSelectedClusters = React.useMemo(() => {
    const params = new URLSearchParams(search);
    const cluster1 = params.get('cluster1');
    const cluster2 = params.get('cluster2');
    if (cluster1 && cluster2) {
      return [cluster1, cluster2];
    }
    return [];
  }, [search]);

  const handleSuccess = () => {
    navigate(getDRPolicyListPageLink(url));
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <>
      <PageHeading title={t('Create DRPolicy')}>
        <Content className="mco-create-data-policy__description">
          <Content component={ContentVariants.small}>
            {t(
              'Get a quick recovery in a remote or secondary cluster with a disaster recovery (DR) policy'
            )}
          </Content>
        </Content>
      </PageHeading>
      <CreateDRPolicyForm
        preSelectedClusters={preSelectedClusters}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </>
  );
};

export default CreateDRPolicy;
