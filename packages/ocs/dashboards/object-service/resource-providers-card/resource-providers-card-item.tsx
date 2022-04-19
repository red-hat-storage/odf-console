import * as React from 'react';
import { RedExclamationCircleIcon } from '@odf/shared/status/icons';
import * as _ from 'lodash';

const ResourceProvidersItemStatus: React.FC<ResourceProvidersRowStatusProps> =
  // eslint-disable-next-line react/display-name
  React.memo(({ status, link }) => (
    <div className="nb-resource-providers-card__row-status">
      <div className="nb-resource-providers-card__row-status-item">
        <a
          href={link}
          style={{ textDecoration: 'none' }}
          target="_blank"
          rel="noopener noreferrer"
        >
          <RedExclamationCircleIcon className="co-dashboard-icon nb-resource-providers-card__status-icon" />
          <span className="nb-resource-providers-card__row-status-item-text">
            {status}
          </span>
        </a>
      </div>
    </div>
  ));

export const ResourceProvidersItem: React.FC<ResourceProvidersRowProps> =
  // eslint-disable-next-line react/display-name
  React.memo(({ title, count, unhealthyProviders, link }) => (
    <div className="co-inventory-card__item">
      <div
        className="nb-resource-providers-card__row-title"
        data-test="nb-resource-providers-card"
      >{`${count} ${title}`}</div>
      {!_.isNil(unhealthyProviders[title]) && unhealthyProviders[title] > 0 ? (
        <ResourceProvidersItemStatus
          status={unhealthyProviders[title]}
          link={link}
        />
      ) : null}
    </div>
  ));

export type ProviderType = {
  [key: string]: number;
};

type ResourceProvidersRowProps = {
  count: number;
  link: string;
  title: string;
  unhealthyProviders: ProviderType;
};

type ResourceProvidersRowStatusProps = {
  link: string;
  status: number;
};
