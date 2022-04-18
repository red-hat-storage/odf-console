import * as React from 'react';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { Progress, ProgressSize } from '@patternfly/react-core';
import { useCustomTranslation } from '../../useCustomTranslationHook';
import { getResiliencyProgress } from '../../utils';


export const DataResiliency: React.FC<DataResiliencyProps> = ({ results }) => {
  const { t } = useCustomTranslation();

  const progress: number = getResiliencyProgress(results);
  const formattedProgress = Math.round(progress * 100);
  return (
    <>
      <Progress
        className="co-activity-item__progress"
        value={formattedProgress}
        size={ProgressSize.sm}
        title={t('Rebuilding data resiliency')}
        label={t('{{formattedProgress, number}}%', { formattedProgress })}
      />
    </>
  );
};

type DataResiliencyProps = {
  results: PrometheusResponse;
};
