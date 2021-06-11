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

const SystemCapacityCard: React.FC = () => {
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
      systemKind: "ocs.openshift.io~v1~StorageCluster",
      systemName: "ocs-storagecluster",
      usedValue: {
        value: 100,
        unit: "GiB",
        string: "100 GiB",
      },
      totalValue: {
        value: 512,
        unit: "GiB",
        string: "512 GiB",
      },
    },
  ];
  return (
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>System Capacity</DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardBody className="capacity-card">
        <CapacityCard data={data} isPercentage />
      </DashboardCardBody>
    </DashboardCard>
  );
};

export default SystemCapacityCard;
