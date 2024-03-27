import * as React from 'react';
import { Timestamp } from '@odf/shared/details-page/timestamp';
import { getName } from '@odf/shared/selectors';
import {
  RowComponentType,
  SelectableTable,
  TableColumnProps,
} from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { sortRows } from '@odf/shared/utils';
import { TFunction } from 'i18next';
import { Text, Bullseye } from '@patternfly/react-core';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import { Td } from '@patternfly/react-table';
import { ModalActionContext, ModalViewContext } from '../utils/reducer';
import { DataPolicyType } from '../utils/types';
import '../style.scss';
import { DataPolicyStatus } from './policy-config-viewer';

const getColumnNames = (t: TFunction) => [
  t('Policy name'),
  t('Policy type'),
  t('Status'),
  t('Activity'),
  t('Assigned on'),
];

const PolicyListViewTableRow: React.FC<RowComponentType<DataPolicyType>> = ({
  row: policy,
  extraProps,
}) => {
  const { t } = useCustomTranslation();
  const columnNames = getColumnNames(t);
  const { kind, isValidated, activity, assignedOn } = policy;
  const { isActionDisabled, setPolicy, setModalContext }: RowExtraProps =
    extraProps;

  const RowActions = (t: TFunction): IAction[] => [
    {
      title: t('View configurations'),
      onClick: () => {
        setPolicy(policy, ModalViewContext.POLICY_CONFIGURATON_VIEW);
        setModalContext(ModalViewContext.POLICY_CONFIGURATON_VIEW);
      },
    },
  ];

  return (
    <>
      <Td translate={null} dataLabel={columnNames[0]}>
        {getName(policy)}
      </Td>
      <Td translate={null} dataLabel={columnNames[1]}>
        {kind}
      </Td>
      <Td translate={null} dataLabel={columnNames[2]}>
        <DataPolicyStatus isValidated={isValidated} t={t} />
      </Td>
      <Td translate={null} dataLabel={columnNames[3]}>
        <Text className={!activity ? 'text-muted' : ''}>
          {!!activity ? activity : t('No activity')}
        </Text>
      </Td>
      <Td translate={null} dataLabel={columnNames[4]}>
        <Timestamp timestamp={assignedOn} />
      </Td>
      <Td translate={null} isActionCell>
        <ActionsColumn
          items={RowActions(t)}
          isDisabled={!!policy.metadata?.deletionTimestamp || isActionDisabled}
          translate={undefined}
        />
      </Td>
    </>
  );
};

export const PolicyListViewTable: React.FC<PolicyListViewTableProps> = ({
  policies,
  selectedPolicies,
  modalActionContext,
  isActionDisabled,
  setPolicy,
  setPolicies,
  setModalContext,
  setModalActionContext,
}) => {
  const { t } = useCustomTranslation();
  const setSelectedRowList = (selectedRowList: DataPolicyType[]) => {
    setPolicies(selectedRowList);
    modalActionContext === ModalActionContext.UN_ASSIGNING_POLICIES &&
      setModalActionContext(selectedRowList.length === 0 && null);
  };

  const columns: TableColumnProps[] = React.useMemo(() => {
    const columnNames = getColumnNames(t);
    return [
      {
        columnName: columnNames[0],
        sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
      },
      {
        columnName: columnNames[1],
        sortFunction: (a, b, c) => sortRows(a, b, c, 'kind'),
      },
      {
        columnName: columnNames[2],
        sortFunction: (a, b, c) => sortRows(a, b, c, 'isValidated'),
      },
      {
        columnName: columnNames[3],
        sortFunction: (a, b, c) => sortRows(a, b, c, 'activity'),
      },
      {
        columnName: columnNames[4],
        sortFunction: (a, b, c) => sortRows(a, b, c, 'assignedOn'),
      },
      { columnName: '' },
    ];
  }, [t]);

  return (
    <div className="mco-manage-policies__row--padding">
      <SelectableTable<DataPolicyType>
        columns={columns}
        rows={policies}
        RowComponent={PolicyListViewTableRow}
        selectedRows={selectedPolicies}
        setSelectedRows={setSelectedRowList}
        isSelectableHidden
        extraProps={{
          isActionDisabled,
          setPolicy,
          setModalContext,
        }}
        loaded={true}
        emptyRowMessage={() => (
          <Bullseye> {t('No assigned data policy found')} </Bullseye>
        )}
      />
    </div>
  );
};

type RowExtraProps = {
  isActionDisabled: boolean;
  setModalContext: (modalViewContext: ModalViewContext) => void;
  setPolicy: (
    policies: DataPolicyType,
    modalViewContext: ModalViewContext
  ) => void;
};

type PolicyListViewTableProps = RowExtraProps & {
  policies: DataPolicyType[];
  selectedPolicies: DataPolicyType[];
  modalActionContext: ModalActionContext;
  setPolicies: (policies: DataPolicyType[]) => void;
  setModalActionContext: (modalActionContext: ModalActionContext) => void;
};
