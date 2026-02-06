import * as React from 'react';
import {
  APP_NAMESPACE_ANNOTATION,
  DISCOVERED_APP_NS,
  GITOPS_OPERATOR_NAMESPACE,
} from '@odf/mco/constants';
import { useACMSafeFetch } from '@odf/mco/hooks';
import { DRPlacementControlKind, DRPolicyKind } from '@odf/mco/types';
import {
  queryNamespacesUsingCluster,
  convertSearchResultToK8sResourceCommon,
} from '@odf/mco/utils';
import { NamespaceModel } from '@odf/shared/models';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import { getAnnotations, getName } from '@odf/shared/selectors';
import { getNamespace } from '@odf/shared/selectors';
import {
  RedExclamationCircleIcon,
  StatusIconAndText,
} from '@odf/shared/status';
import { RowComponentType, SelectableTable } from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isSystemNamespace, sortRows } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  ListPageFilter,
  useListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import { Bullseye, Grid, GridItem, Content } from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';
import {
  EnrollDiscoveredApplicationAction,
  EnrollDiscoveredApplicationStateType,
} from '../../utils/reducer';
import './namespace-step.scss';

export const findAllEligiblePolicies = (
  clusterName: string,
  drPolicies: DRPolicyKind[]
) =>
  // Filter all the polcies which are all matching for the selected cluster.
  drPolicies.filter((policy) => policy.spec.drClusters.includes(clusterName));

const getProtectedNamespaces = (
  drPlacements: DRPlacementControlKind[],
  policies: DRPolicyKind[]
): string[] => {
  if (!!drPlacements?.length) {
    // Find all the protected namespaces from DRPCs.
    // By comparing the eligible DRPolicies, filtering the DRPCs and protected namespaces for the peer clusters.
    const policyNames: string[] = policies.map(getName);
    return drPlacements.reduce((acc, drpc) => {
      if (policyNames.includes(drpc.spec.drPolicyRef.name)) {
        const namespace = getNamespace(drpc);
        if (namespace === DISCOVERED_APP_NS) {
          // Protected namespaces from discovered DRPC
          acc.push(...(drpc.spec?.protectedNamespaces || []));
        } else if (namespace === GITOPS_OPERATOR_NAMESPACE) {
          // Protected namespaces from ApplicationSet DRPC
          const ns = getAnnotations(drpc)?.[APP_NAMESPACE_ANNOTATION];
          !!ns && acc.push(ns);
        } else {
          // Protected namespaces from Subscription DRPC
          acc.push(namespace);
        }
      }
      return acc;
    }, []);
  } else {
    return [];
  }
};

const getColumns = (t: TFunction) => [
  {
    columnName: t('Name'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
  },
];

const TableRow: React.FC<RowComponentType<K8sResourceCommon>> = ({
  row: namespaceObj,
}) => {
  const { t } = useCustomTranslation();
  return (
    <Td dataLabel={getColumns(t)[0].columnName}>
      <ResourceIcon resourceModel={NamespaceModel} />
      {getName(namespaceObj)}
    </Td>
  );
};

const EmptyRowMessageWrapper: React.FC = ({ children }) => {
  return (
    <Bullseye className="mco-namespace-selection__border pf-v5-u-mt-md pf-v5-u-mb-sm pf-v5-u-h-33vh">
      {children}
    </Bullseye>
  );
};

const EmptyRowMessage: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <EmptyRowMessageWrapper>
      {t('There are no namespaces to display.')}
    </EmptyRowMessageWrapper>
  );
};

const NoClusterEmptyRowMessage: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <EmptyRowMessageWrapper>
      {t(
        'There are no namespaces to display. Select a cluster first to view namespaces.'
      )}
    </EmptyRowMessageWrapper>
  );
};

export const NamespaceSelectionTable: React.FC<
  NamespaceSelectionTableProps
> = ({
  namespaces,
  clusterName,
  policies,
  drPlacements,
  isValidationEnabled,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const protectedNamespaces = React.useMemo(() => {
    const eligiblePolicies = findAllEligiblePolicies(clusterName, policies);
    return getProtectedNamespaces(drPlacements, eligiblePolicies);
  }, [drPlacements, clusterName, policies]);

  const searchQuery = React.useMemo(
    () => queryNamespacesUsingCluster(clusterName),
    [clusterName]
  );

  // ACM search proxy API call
  const [searchResult, searchError, searchLoaded] =
    useACMSafeFetch(searchQuery);

  const userNamespaces: K8sResourceCommon[] = React.useMemo(() => {
    if (searchLoaded && !searchError) {
      // Converting from search result type to K8sResourceCommon for shared components compatibility.
      const allNamespaces = convertSearchResultToK8sResourceCommon(
        searchResult?.data.searchResult?.[0]?.items || []
      );
      // Filtering only user namespaces for the DR protection.
      return allNamespaces.filter((namespaceObj) => {
        const namespace = getName(namespaceObj);
        return (
          !isSystemNamespace(namespace) &&
          !protectedNamespaces.includes(namespace)
        );
      });
    }
    return [];
  }, [searchResult, protectedNamespaces, searchLoaded, searchError]);

  const [data, filteredData, onFilterChange] =
    useListPageFilter(userNamespaces);

  const setSelectedNamespaces = (selectedNamespaces: K8sResourceCommon[]) =>
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_NAMESPACES,
      payload: selectedNamespaces,
    });

  const namespaceValidated = isValidationEnabled && !namespaces.length;

  return (
    <Grid>
      <GridItem span={10}>
        <Content component="p" className="text-muted pf-v5-u-font-size-lg">
          {!!clusterName
            ? t('{{count}} results found for {{clusterName}}', {
                count: userNamespaces.length,
                clusterName,
              })
            : t('0 results found')}
        </Content>
      </GridItem>
      <GridItem span={10}>
        <ListPageFilter
          data={data}
          loaded={searchLoaded}
          onFilterChange={onFilterChange}
        />
        {namespaceValidated && (
          <StatusIconAndText
            icon={<RedExclamationCircleIcon />}
            title={t('Select a namespace')}
          />
        )}
        <SelectableTable<K8sResourceCommon>
          className="mco-namespace-selection__table mco-namespace-selection__border pf-v5-u-mt-sm pf-v5-u-mb-sm pf-v5-u-h-33vh"
          columns={getColumns(t)}
          rows={filteredData}
          RowComponent={TableRow}
          selectedRows={namespaces}
          setSelectedRows={setSelectedNamespaces}
          loaded={searchLoaded}
          borders={false}
          emptyRowMessage={
            searchError
              ? searchError
              : clusterName
                ? EmptyRowMessage
                : NoClusterEmptyRowMessage
          }
        />
        <Content component="p">
          {t(
            'This list does not include namespaces where applications are enrolled separately under disaster recovery protection.'
          )}
        </Content>
      </GridItem>
    </Grid>
  );
};

type NamespaceSelectionTableProps = {
  namespaces: K8sResourceCommon[];
  clusterName: string;
  policies: DRPolicyKind[];
  drPlacements: DRPlacementControlKind[];
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>;
};
