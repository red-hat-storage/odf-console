import * as React from "react";
import { useK8sWatchResource } from "badhikar-dynamic-plugin-sdk/api";
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
  DashboardCardTitle,
  RecentEventsBody,
} from "badhikar-dynamic-plugin-sdk/internalAPI";
import { FirehoseResource } from "badhikar-dynamic-plugin-sdk";
import "./activity-card.scss";

const eventsResource: FirehoseResource = {
  isList: true,
  kind: "Event",
  prop: "events",
};

const ActivityCard: React.FC = () => {
  const [events, eventsLoaded] = useK8sWatchResource(eventsResource);

  return (
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>Activity</DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardBody className="odf-activity-card">
        <RecentEventsBody
          events={{ data: events, loaded: eventsLoaded } as any}
        />
      </DashboardCardBody>
    </DashboardCard>
  );
};

export default ActivityCard;
