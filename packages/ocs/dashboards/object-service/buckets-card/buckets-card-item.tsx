import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeNumber, getGaugeValue } from '@odf/shared/utils';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { Link } from 'react-router-dom';

const formatCount = (count: number, t: TFunction) => {
  const hCount = humanizeNumber(count).string;
  const pluralizeObject = t('Object', { count });
  return `${hCount} ${pluralizeObject}`;
};

export const BucketsTitle: React.FC<BucketsTitleProps> = ({
  objects,
  link,
  error,
  children,
}) => {
  const { t } = useCustomTranslation();

  let objectsBody: JSX.Element;

  if (!objects && !error) {
    objectsBody = <div className="skeleton-text" />;
  } else {
    const objectsCount = getGaugeValue(objects);
    objectsBody = (
      <div className="text-secondary">
        {!error && objectsCount
          ? formatCount(Number(objectsCount), t)
          : t('Not available')}
      </div>
    );
  }
  return (
    <div className="nb-buckets-card__buckets-status-title">
      {link ? <Link to={link}>{children}</Link> : children}
      {objectsBody}
    </div>
  );
};

export type BucketsTitleProps = {
  objects: PrometheusResponse;
  link: string;
  error: boolean;
};
