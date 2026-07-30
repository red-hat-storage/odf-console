import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Content, ContentVariants } from '@patternfly/react-core';

export type InlineResourceRequirementsTextProps = {
  minCpu: number;
  minMem: number;
  clusterCpu?: number;
  clusterMemoryGiB?: number;
  helpText?: React.ReactNode;
};

export const InlineResourceRequirementsText: React.FC<
  InlineResourceRequirementsTextProps
> = ({ minCpu, minMem, clusterCpu, clusterMemoryGiB, helpText }) => {
  const { t } = useCustomTranslation();

  return (
    <Content>
      <Content component={ContentVariants.p} className="pf-v6-u-mt-2xl">
        <span className="pf-v6-u-mr-sm">
          {t('Aggregated resource requirements:')}
        </span>
        <span className="pf-v6-u-font-weight-bold">
          {minCpu} {t('CPUs')}
        </span>{' '}
        {t('and')}{' '}
        <span className="pf-v6-u-font-weight-bold">
          {minMem} {t('GiB RAM')}
        </span>
        {helpText}
      </Content>
      {clusterCpu !== undefined && clusterMemoryGiB !== undefined && (
        <Content component={ContentVariants.p} className="pf-v6-u-mt-sm">
          <span className="pf-v6-u-mr-sm">
            {t('Cluster resources available:')}
          </span>
          <span className="pf-v6-u-font-weight-bold">
            {clusterCpu} {t('CPUs')}
          </span>{' '}
          {t('and')}{' '}
          <span className="pf-v6-u-font-weight-bold">
            {clusterMemoryGiB} {t('GiB RAM')}
          </span>
        </Content>
      )}
    </Content>
  );
};
