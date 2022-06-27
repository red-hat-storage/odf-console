import * as React from 'react';
import { DataResiliency } from '@odf/shared/dashboards/data-resiliency/data-resiliency-activity';
import { formatPrometheusDuration } from '@odf/shared/details-page/datetime';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getGaugeValue } from '@odf/shared/utils';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import './data-resiliency-activity.scss';

export const NoobaaDataResiliency: React.FC<DataResiliencyProps> = ({
  results,
}) => {
  const { t } = useCustomTranslation();

  const eta = getGaugeValue(results[1]);
  const formattedEta = formatPrometheusDuration(parseInt(eta, 10) * 1000);

  return (
    <>
      <DataResiliency results={results[0]} />
      {eta && (
        <span className="text-secondary nb-data-resiliency__eta">
          {t('Estimating {{formattedEta}} to completion', {
            formattedEta,
          })}
        </span>
      )}
    </>
  );
};

type DataResiliencyProps = {
  results: PrometheusResponse[];
};
