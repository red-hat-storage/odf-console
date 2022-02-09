import { PrometheusResponse } from "@openshift-console/dynamic-plugin-sdk";

export const getGaugeValue = (response: PrometheusResponse) =>
  response?.data?.result?.[0]?.value?.[1];
