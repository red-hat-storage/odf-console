import * as React from 'react';
import { useK8sWatchResource } from 'badhikar-dynamic-plugin-sdk/api';
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
  DashboardCardTitle,
  EventKind,
  RecentEventsBody,
} from 'badhikar-dynamic-plugin-sdk/internalAPI';
import { FirehoseResource } from 'badhikar-dynamic-plugin-sdk';
import './activity-card.scss';

const eventsResource: FirehoseResource = {
  isList: true,
  kind: 'Event',
  prop: 'events',
};

const ActivityCard: React.FC = () => {
  const [data, loaded, loadError] =
    useK8sWatchResource<EventKind[]>(eventsResource);

  return (
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>Activity</DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardBody className="odf-activityCard">
        <RecentEventsBody
          events={{
            data,
            loaded,
            loadError,
          }}
        />
      </DashboardCardBody>
    </DashboardCard>
  );
};

export default ActivityCard;
