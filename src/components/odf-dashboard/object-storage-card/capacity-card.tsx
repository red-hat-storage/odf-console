import * as React from "react";
import {
  DashboardCard,
  DashboardCardTitle,
  DashboardCardBody,
  DashboardCardHeader,
} from "badhikar-dynamic-plugin-sdk/internalAPI";
import CapacityCard from "../../common/capacity-card/capacity-card";

/* const totalQuery = QUERIES[DashboardQueries.SYSTEM_CAPACITY_TOTAL];
const usedQuery = QUERIES[DashboardQueries.SYSTEM_CAPACITY_USED]; */

const ObjectCapacityCard: React.FC = () => {
  /*   const [totalValue] = usePrometheusDashboardQueries(
    totalQuery,
    humanizeBinaryBytes
  );
  const [usedValue] = usePrometheusDashboardQueries(
    usedQuery,
    humanizeBinaryBytes
  ); */
  const data = [
    {
      systemName: "ocs-storagecluster",
      managedSystemName: "",
      managedSystemKind: "",
      usedValue: {
        value: 100,
        unit: "GiB",
        string: "100 GiB",
      },
      totalValue: {
        value: 100,
        unit: "GiB",
        string: "100 GiB",
      },
    },
  ];
  return (
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>
          External Object Provider Used Capacity
        </DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardBody className="capacity-card">
        <CapacityCard data={data} relative={true} />
      </DashboardCardBody>
    </DashboardCard>
  );
};

export default ObjectCapacityCard;
