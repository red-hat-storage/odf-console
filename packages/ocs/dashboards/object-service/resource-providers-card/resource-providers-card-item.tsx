import * as React from 'react';
import * as _ from 'lodash-es';

export const ResourceProvidersItem: React.FC<ResourceProvidersRowProps> =
  // eslint-disable-next-line react/display-name
  React.memo(({ title, count }) => (
    <div className="co-inventory-card__item">
      <div
        className="nb-resource-providers-card__row-title"
        data-test="nb-resource-providers-card"
      >{`${count} ${title}`}</div>
    </div>
  ));

export type ProviderType = {
  [key: string]: number;
};

type ResourceProvidersRowProps = {
  count: number;
  title: string;
};
