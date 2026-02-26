import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { FirehoseResource } from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { RecentEventsBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import { EventKind } from '@openshift-console/dynamic-plugin-sdk-internal/lib/api/internal-types';
import classNames from 'classnames';
import {
  Card,
  CardBody,
  CardHeader,
  CardProps,
  CardTitle,
} from '@patternfly/react-core';
import './GeneralOverviewActivityCard.scss';

const eventsResource: FirehoseResource = {
  isList: true,
  kind: 'Event',
  prop: 'events',
};

export const GeneralOverviewActivityCard: React.FC<CardProps> = ({
  className,
}) => {
  const { t } = useCustomTranslation();
  const [data, loaded, loadError] =
    useK8sWatchResource<EventKind[]>(eventsResource);

  return (
    <Card
      className={classNames(className, 'odf-general-overview__activity-card')}
    >
      <CardHeader>
        <CardTitle>{t('Activity')}</CardTitle>
      </CardHeader>
      <CardBody className="odf-general-overview__activity-card-body">
        <RecentEventsBody
          events={{
            data,
            loaded,
            loadError,
          }}
        />
      </CardBody>
    </Card>
  );
};
