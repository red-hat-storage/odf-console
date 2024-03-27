import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import {
  getLatestDate,
  fromNow,
  utcDateTimeFormatter,
} from '@odf/shared/details-page/datetime';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { StatusIconAndText } from '@openshift-console/dynamic-plugin-sdk';
import { Table } from '@patternfly/react-table/deprecated';
import * as _ from 'lodash-es';
import {
  Flex,
  FlexItem,
  Text,
  TextContent,
  TextVariants,
  Tooltip,
} from '@patternfly/react-core';
import {
  Tbody,
  Tr,
  Td,
  Th,
  Thead,
  ThProps,
  SortByDirection,
} from '@patternfly/react-table';
import { DRPC_STATUS } from '../../../../constants';
import { DRPlacementControlKind } from '../../../../types';
import {
  DRPolicyMap,
  getDRPoliciesCount,
  getCurrentStatus,
  getDRStatus,
} from '../../../../utils';
import './dr-status-table.scss';

const reactPropFix = {
  translate: 'yes',
};

const getLastDataSyncTime = (drpcList: DRPlacementControlKind[]): string =>
  getLatestDate(drpcList?.map((drpc) => drpc?.status?.lastGroupSyncTime));

const isRelocating = (status: DRPC_STATUS) =>
  [DRPC_STATUS.Relocating, DRPC_STATUS.Relocated].includes(status);

const isFailingOver = (status: DRPC_STATUS) =>
  [DRPC_STATUS.FailingOver, DRPC_STATUS.FailedOver].includes(status);

const getTargetClusters = (
  currentStatus: string,
  drpcList: DRPlacementControlKind[]
) => {
  const targetClusters = drpcList.reduce((acc, drpc) => {
    const status = DRPC_STATUS[drpc?.status?.phase] || '';
    if (status === currentStatus) {
      (isRelocating(status) && acc.add(drpc?.spec?.preferredCluster)) ||
        (isFailingOver(status) && acc.add(drpc?.spec?.failoverCluster));
    }
    return acc;
  }, new Set());
  return [...targetClusters].join(',');
};

const getSyncStatus = (syncTime: string) =>
  !!syncTime
    ? {
        text: fromNow(syncTime),
        toolTip: utcDateTimeFormatter.format(new Date(syncTime)),
      }
    : {};

const getSortableRowValues = (drStatus: DRCurrentStatusType): string[] => [
  drStatus?.drPolicyName,
  drStatus?.lastSync?.text,
  drStatus?.currentStatus?.text,
];

const sortDRStatus = (
  drCurrentStatus: DRCurrentStatusType[],
  activeSortIndex: number,
  activeSortDirection: string
) => {
  let sortedDRStatus = drCurrentStatus;
  if (activeSortIndex !== null && sortedDRStatus?.length) {
    sortedDRStatus = drCurrentStatus.sort((a, b) => {
      const aValue = getSortableRowValues(a)[activeSortIndex] || '';
      const bValue = getSortableRowValues(b)[activeSortIndex] || '';
      if (activeSortDirection === SortByDirection.asc) {
        return aValue.localeCompare(bValue);
      }
      return bValue.localeCompare(aValue);
    });
  }
  return sortedDRStatus;
};

export const DRPoliciesStatusTable: React.FC<DRPoliciesStatusTableProps> = ({
  drPolicies,
}) => {
  const { t } = useCustomTranslation();
  const [activeSortIndex, setActiveSortIndex] = React.useState<number>(null);
  const [activeSortDirection, setActiveSortDirection] =
    React.useState<SortByDirection>();
  const drCurrentStatus: DRCurrentStatusType[] = React.useMemo(
    () =>
      _.map(drPolicies, (drpcList, policyName) => {
        const currentStatus = getCurrentStatus(drpcList);
        const targetClusters = getTargetClusters(currentStatus, drpcList);
        const lastSyncTime = getLastDataSyncTime(drpcList);
        return {
          drPolicyName: policyName,
          lastSync: getSyncStatus(lastSyncTime),
          currentStatus: getDRStatus({ currentStatus, targetClusters, t }),
        };
      }),
    [drPolicies, t]
  );

  const sortedDRStatus = React.useMemo(
    () => sortDRStatus(drCurrentStatus, activeSortIndex, activeSortDirection),
    [drCurrentStatus, activeSortIndex, activeSortDirection]
  );

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex,
      direction: activeSortDirection,
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  const count = getDRPoliciesCount(drPolicies);
  const title = pluralize(
    count,
    t('Disaster recovery policy'),
    t('Disaster recovery policies'),
    true
  );

  return (
    <Flex
      direction={{ default: 'column' }}
      spaceItems={{ default: 'spaceItemsMd' }}
    >
      <FlexItem>
        <TextContent>
          <Text component={TextVariants.h4} data-test="dr-policies-count">
            {title}
          </Text>
        </TextContent>
      </FlexItem>
      <FlexItem>
        <TextContent>
          <Text component={TextVariants.small}>
            {t(
              'Track the status of ongoing activities associated with the policy in use with your application.'
            )}
          </Text>
        </TextContent>
      </FlexItem>
      <FlexItem className="mco-dr-subs-status-table__box">
        <Table
          {...reactPropFix}
          variant="compact"
          aria-label={t('Application list')}
          borders={false}
          gridBreakPoint=""
          isStickyHeader
        >
          <Thead {...reactPropFix}>
            <Tr {...reactPropFix}>
              <Th
                {...reactPropFix}
                sort={getSortParams(0)}
                data-test="policy-name-column"
              >
                {t('Policy name')}
              </Th>
              <Th
                {...reactPropFix}
                sort={getSortParams(1)}
                data-test="last-sync-column"
              >
                {t('Last sync')}
              </Th>
              <Th
                {...reactPropFix}
                sort={getSortParams(2)}
                data-test="activity-status-column"
              >
                {t('Activity status')}
              </Th>
            </Tr>
          </Thead>
          <Tbody {...reactPropFix}>
            {sortedDRStatus?.map((drstatus, rowIndex) => (
              <Tr {...reactPropFix} key={rowIndex}>
                <Td {...reactPropFix} data-test={`policy-name-row-${rowIndex}`}>
                  {drstatus?.drPolicyName}
                </Td>
                <Td {...reactPropFix} data-test={`last-sync-row-${rowIndex}`}>
                  <Tooltip content={drstatus?.lastSync?.toolTip}>
                    <StatusIconAndText title={drstatus?.lastSync?.text} />
                  </Tooltip>
                </Td>
                <Td
                  {...reactPropFix}
                  data-test={`activity-status-row-${rowIndex}`}
                >
                  <Tooltip content={drstatus?.currentStatus?.toolTip}>
                    <StatusIconAndText
                      title={drstatus?.currentStatus?.text}
                      icon={drstatus?.currentStatus?.icon}
                    />
                  </Tooltip>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </FlexItem>
    </Flex>
  );
};

type DRPoliciesStatusTableProps = {
  drPolicies: DRPolicyMap;
};

type Status = {
  text?: string;
  icon?: JSX.Element;
  toolTip?: React.ReactNode;
};
type DRCurrentStatusType = {
  drPolicyName: string;
  lastSync: Status;
  currentStatus: Status;
};
