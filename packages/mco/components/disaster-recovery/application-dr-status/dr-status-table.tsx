import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { GreenCheckCircleIcon } from '@openshift-console/dynamic-plugin-sdk';
import {
  Flex,
  FlexItem,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
import {
  TableComposable,
  Tbody,
  Tr,
  Td,
  Th,
  Thead,
  ThProps,
  SortByDirection,
} from '@patternfly/react-table';
import { DRPlacementControlKind } from '../../../types';
import { DRPolicyMap, getDRPoliciesCount } from '../../../utils';
import { DRPC_STATUS } from './dr-status-card';
import './dr-status-table.scss';

const reactPropFix = {
  translate: 'yes',
};

const getCurrentStatus = (drpcList: DRPlacementControlKind[]): string =>
  drpcList.reduce((prevStatus, drpc) => {
    const newStatus = DRPC_STATUS[drpc?.status?.phase] || '';
    return [DRPC_STATUS.Relocating, DRPC_STATUS.FailingOver].includes(newStatus)
      ? newStatus
      : prevStatus || newStatus;
  }, '');

const getDRStatus = (currentStatus: string) => {
  switch (currentStatus) {
    case DRPC_STATUS.Relocating:
    case DRPC_STATUS.FailingOver:
      return {
        text: currentStatus,
        icon: <InProgressIcon />,
      };
    case DRPC_STATUS.Relocated:
    case DRPC_STATUS.FailedOver:
      return {
        text: currentStatus,
        icon: <GreenCheckCircleIcon />,
      };
    default:
      return {};
  }
};

const getSortableRowValues = (drStatus: DRCurrentStatusType): string[] => [
  drStatus?.drPolicyName,
  drStatus?.lastSync,
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
      const aValue = getSortableRowValues(a)[activeSortIndex];
      const bValue = getSortableRowValues(b)[activeSortIndex];
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
      Object.entries(drPolicies).map(([policyName, drpcList]) => ({
        drPolicyName: policyName,
        // TODO:Gowtham Once it is available on DRPC CR
        lastSync: '',
        currentStatus: getDRStatus(getCurrentStatus(drpcList)),
      })),
    [drPolicies]
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

  return (
    <Flex
      direction={{ default: 'column' }}
      spaceItems={{ default: 'spaceItemsMd' }}
    >
      <FlexItem>
        <TextContent>
          <Text component={TextVariants.h4} data-test="dr-policies-count">
            {t('{{count}} Disaster recovery policies ', {
              count: getDRPoliciesCount(drPolicies),
            })}
          </Text>
        </TextContent>
      </FlexItem>
      <FlexItem>
        <TextContent>
          <Text component={TextVariants.small}>
            {t(
              'View the status of the ongoing activities associated to the policies that are being used with applications.'
            )}
          </Text>
        </TextContent>
      </FlexItem>
      <FlexItem className="mco-dr-status-status-table__box">
        <TableComposable
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
                sort={getSortParams(1)}
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
                  {drstatus?.lastSync}
                </Td>
                <Td
                  {...reactPropFix}
                  data-test={`activity-status-row-${rowIndex}`}
                >
                  <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                    <FlexItem
                      data-test={`activity-status-row-${rowIndex}-icon`}
                    >
                      {drstatus?.currentStatus?.icon}
                    </FlexItem>
                    <FlexItem
                      data-test={`activity-status-row-${rowIndex}-text`}
                    >
                      {drstatus?.currentStatus?.text}
                    </FlexItem>
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </TableComposable>
      </FlexItem>
    </Flex>
  );
};

type DRPoliciesStatusTableProps = {
  drPolicies: DRPolicyMap;
};

type DRCurrentStatusType = {
  drPolicyName: string;
  lastSync: string;
  currentStatus: {
    text?: string;
    icon?: JSX.Element;
  };
};
