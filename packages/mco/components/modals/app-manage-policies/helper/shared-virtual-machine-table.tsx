import * as React from 'react';
import {
  getName,
  RowComponentType,
  SelectableTable,
  Table,
  useCustomTranslation,
  TableVariant as TVariant,
  VirtualMachineModel,
  DRPlacementControlModel,
  SelectionType,
} from '@odf/shared';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import { sortRows, sort } from '@odf/shared/utils';
import { StatusIconAndText } from '@openshift-console/dynamic-plugin-sdk';
import { stubTrue } from 'lodash-es';
import { TFunction } from 'react-i18next';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { VirtualMachineIcon } from '@patternfly/react-icons';
import { TableVariant, Td } from '@patternfly/react-table';
import {
  ManagePolicyStateAction,
  ManagePolicyStateType,
  ModalViewContext,
} from '../utils/reducer';
import { DRPlacementControlType, DRPolicyType } from '../utils/types';
import { findPolicy } from './select-policy-wizard-content';

// Define table columns
const getSharedVMGroupsColumns = (t: TFunction<string>) => [
  {
    columnName: t('Shared groups'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
  },
  { columnName: t('Virtual machines') },
  { columnName: t('Action') },
];

// Row component for the table
const SharedVMGroupsTableRow: React.FC<
  RowComponentType<DRPlacementControlType>
> = ({ row: placementControlInfo, extraProps: { onClick } }) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <Td dataLabel={getSharedVMGroupsColumns(t)[0].columnName}>
        <ResourceIcon resourceModel={DRPlacementControlModel} />
        {getName(placementControlInfo)}
      </Td>
      <Td dataLabel={getSharedVMGroupsColumns(t)[1].columnName}>
        <StatusIconAndText
          icon={<VirtualMachineIcon />}
          title={placementControlInfo.vmSharedGroup.length.toString()}
        />
      </Td>
      <Td dataLabel={getSharedVMGroupsColumns(t)[2].columnName}>
        <Button
          variant={ButtonVariant.link}
          onClick={() => onClick(placementControlInfo)}
          isInline
        >
          {t('View VMs')}
        </Button>
      </Td>
    </>
  );
};

// Main component for displaying the table
export const SharedVMGroupsTable: React.FC<SharedVMGroupsTableProps> = ({
  sharedVMGroups,
  sharedVMGroup,
  matchingPolicies,
  toggleDrawer,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const setSharedVMGroupInfo = (selectedRows: DRPlacementControlType[]) => {
    const drpc = selectedRows[0];
    const drPolicy = findPolicy(drpc.drPolicyRef.name, matchingPolicies);

    dispatch({
      type: ManagePolicyStateType.SET_SHARED_VM_GROUP_INFO,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
      payload: {
        policy: drPolicy,
        k8sSyncInterval: drpc.k8sResourceSyncInterval,
        protectionName: drpc.vmSharedGroupName,
        sharedVMGroup: drpc.vmSharedGroup,
      },
    });
  };

  return (
    <SelectableTable<DRPlacementControlType>
      columns={getSharedVMGroupsColumns(t)}
      rows={sharedVMGroups}
      RowComponent={SharedVMGroupsTableRow}
      selectedRows={[sharedVMGroup]}
      setSelectedRows={setSharedVMGroupInfo}
      loaded
      variant={TVariant.COMPACT}
      isColumnSelectableHidden
      isRowSelectable={stubTrue}
      selectionType={SelectionType.RADIO}
      extraProps={{ onClick: toggleDrawer }}
    />
  );
};

// Define table columns
const getSharedVMGroupColumns = (t: TFunction<string>) => [
  { columnName: t('Name'), sortFunction: (a, b, c) => sort(a, b, c) },
];

// Row component for the table
const sharedVMGroupTableRow = (vmName: string, index: number) => [
  <>
    <ResourceIcon resourceModel={VirtualMachineModel} key={index} />
    {vmName}
  </>,
];

// Main component for displaying the table
export const ViewSharedVMGroupTable: React.FC<ViewSharedVMGroupTableProps> = ({
  sharedVMGroup,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Table
      columns={getSharedVMGroupColumns(t)}
      rawData={sharedVMGroup.vmSharedGroup as []}
      rowRenderer={sharedVMGroupTableRow as any}
      ariaLabel={t('Virtual machines')}
      variant={TableVariant.compact}
    />
  );
};

// Type definitions
type ViewSharedVMGroupTableProps = { sharedVMGroup: DRPlacementControlType };

type SharedVMGroupsTableProps = {
  sharedVMGroups: DRPlacementControlType[];
  sharedVMGroup: DRPlacementControlType;
  matchingPolicies: DRPolicyType[];
  toggleDrawer: (sharedVMGroup: DRPlacementControlType) => void;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
};
