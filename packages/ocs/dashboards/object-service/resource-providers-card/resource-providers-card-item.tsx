import * as React from 'react';
import { RedExclamationCircleIcon } from '@odf/shared/status/icons';
import * as _ from 'lodash-es';

const ResourceProvidersItemStatus: React.FC<ResourceProvidersRowStatusProps> =
  // eslint-disable-next-line react/display-name
  React.memo(({ status }) => (
    <div className="nb-resource-providers-card__row-status">
      <div className="nb-resource-providers-card__row-status-item">
        <RedExclamationCircleIcon className="co-dashboard-icon nb-resource-providers-card__status-icon" />
        <span className="nb-resource-providers-card__row-status-item-text">
          {status}
        </span>
      </div>
    </div>
  ));

export const ResourceProvidersItem: React.FC<ResourceProvidersRowProps> =
  // eslint-disable-next-line react/display-name
  React.memo(({ title, count, unhealthyProviders }) => (
    <div className="co-inventory-card__item">
      <div
        className="nb-resource-providers-card__row-title"
        data-test="nb-resource-providers-card"
      >{`${count} ${title}`}</div>
      {!_.isNil(unhealthyProviders[title]) && unhealthyProviders[title] > 0 ? (
        <ResourceProvidersItemStatus status={unhealthyProviders[title]} />
      ) : null}
    </div>
  ));

export type ProviderType = {
  [key: string]: number;
};

type ResourceProvidersRowProps = {
  count: number;
  title: string;
  unhealthyProviders: ProviderType;
};

type ResourceProvidersRowStatusProps = {
  status: number;
};
