/**
 * Page Route: odf/system/:systemKind/:systemName
 */
import * as React from "react";
import { useResolvedExtensions } from "badhikar-dynamic-plugin-sdk/api";
import {
  ODFPluginDashboard,
  isODFDashboardPlugin,
} from "badhikar-dynamic-plugin-sdk";
import { RouteComponentProps, StaticContext } from "react-router";
import PageHeading from "../common/heading/page-heading";

type DashboardPageProps = RouteComponentProps<
  {
    systemKind: string;
    systemName: string;
  },
  StaticContext,
  { prevLocation: string }
>;

const isOverview = (path: string) => path.includes("/odf/overview");

const referenceFor = (model): string =>
  `${model.group}~${model.version}~${model.kind}`;

const DashboardPage: React.FC<DashboardPageProps> = (props) => {
  console.log("History", props);
  const { systemKind, systemName } = props.match.params;
  const { prevLocation = "" } = props.location.state || {};

  const [extensions] =
    useResolvedExtensions<ODFPluginDashboard>(isODFDashboardPlugin);
  const dashboardForModel = extensions?.filter(
    (ext) => referenceFor(ext?.properties?.model) === systemKind
  )?.[0];
  const Component = dashboardForModel?.properties?.component;

  const breadcrumbs = [
    {
      name: isOverview(prevLocation) ? "Overview" : "Systems",
      path: prevLocation || "/odf",
    },
    {
      name: systemName,
      path: props.location.pathname,
    },
  ];

  return (
    <>
      <PageHeading title={systemName} breadcrumbs={breadcrumbs} />
      {Component && (
        <Component name={systemName} kind={systemKind} {...props} />
      )}
      ;
    </>
  );
};

export default DashboardPage;
