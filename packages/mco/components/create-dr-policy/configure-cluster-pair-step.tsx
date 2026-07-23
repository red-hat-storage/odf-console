import * as React from 'react';
import { PrePairNetworkValidationState } from '@odf/mco/hooks';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Content, ContentVariants, Title } from '@patternfly/react-core';
import { PrePairNetworkValidation } from './pre-pair-network-validation';

type ConfigureClusterPairStepProps = {
  clusterNames: string[];
  validation: PrePairNetworkValidationState;
  docHref?: string;
};

export const ConfigureClusterPairStep: React.FC<
  ConfigureClusterPairStepProps
> = ({ clusterNames, validation, docHref }) => {
  const { t } = useCustomTranslation();

  return (
    <div className="mco-create-data-policy__body">
      <Title headingLevel="h2" size="lg" className="pf-v6-u-mb-md">
        {t('Configure cluster pair')}
      </Title>
      <Content className="pf-v6-u-mb-lg">
        <Content component={ContentVariants.small}>
          {t(
            'The first time a policy is created between two clusters, the clusters must be paired together.'
          )}
        </Content>
      </Content>
      <PrePairNetworkValidation
        clusterNames={clusterNames}
        validation={validation}
        docHref={docHref}
      />
    </div>
  );
};
