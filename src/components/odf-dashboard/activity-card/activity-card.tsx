import * as React from "react";
import { useK8sWatchResource } from "badhikar-dynamic-plugin-sdk/api";
import { RecentEventsBody } from "badhikar-dynamic-plugin-sdk/internalAPI";
import { FirehoseResource } from "badhikar-dynamic-plugin-sdk";
import { Card, CardBody, CardHeader, CardTitle } from "@patternfly/react-core";
import "./activity-card.scss";

const eventsResource: FirehoseResource = {
  isList: true,
  kind: "Event",
  prop: "events",
};

const ActivityCard: React.FC = () => {
  const [events, eventsLoaded] = useK8sWatchResource(eventsResource);

  return (
    <Card className="co-dashboard-card co-dashboard-card--gradient">
      <CardHeader className="co-dashboard-card__header">
        <CardTitle className="co-dashboard-card__title">Activity</CardTitle>
      </CardHeader>
      <CardBody className="co-dashboard-card__body co-dashboard-card__body--no-padding co-activity-card__body odf-activity-card">
        <RecentEventsBody
          events={{ data: events, loaded: eventsLoaded } as any}
        />
      </CardBody>
    </Card>
  );
};

export default ActivityCard;
