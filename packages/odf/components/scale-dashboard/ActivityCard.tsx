import * as React from 'react';
import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import { EventModel, useCustomTranslation } from '@odf/shared';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { EventKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import {
  ActivityBody,
  RecentEventsBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';

const eventsResource = { isList: true, kind: EventModel.kind };

const RecentEvent: React.FC = () => {
  const [data, loaded, loadError] =
    useK8sWatchResource<EventKind[]>(eventsResource);
  const filteredEvents = data?.filter(
    (event) => event.metadata.namespace === IBM_SCALE_NAMESPACE
  );
  return (
    <RecentEventsBody events={{ data: filteredEvents, loaded, loadError }} />
  );
};
const ActivityCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Activity')}</CardTitle>
      </CardHeader>
      <CardBody>
        <ActivityBody>
          <RecentEvent />
        </ActivityBody>
      </CardBody>
    </Card>
  );
};

export default ActivityCard;
