import * as React from 'react';
import { utcDateTimeFormatter } from '@odf/shared/details-page/datetime';
import { getName } from '@odf/shared/selectors';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
} from '@odf/shared/status/icons';
import {
  RowComponentType,
  SelectableTable,
  TableColumnProps,
} from '@odf/shared/table/selectable-table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { StatusIconAndText } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { Text } from '@patternfly/react-core';
import {
  ActionsColumn,
  IAction,
  SortByDirection,
} from '@patternfly/react-table';
import { Td } from '@patternfly/react-table';
import { ModalActionContext, ModalViewContext } from '../utils/reducer';
import { DataPolicyType } from '../utils/types';
import '../style.scss';

const sortRows = (
  a: DataPolicyType,
  b: DataPolicyType,
  c: SortByDirection,
  sortField: string
) => {
  const negation = c !== SortByDirection.asc;
  const aValue = a?.[sortField] || '';
  const bValue = b?.[sortField] || '';
  const sortVal = (aValue as string).localeCompare(bValue as string);
  return negation ? -sortVal : sortVal;
};

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
  const { setPolicy, setModalContext }: RowExtraProps = extraProps;
  const status = isValidated ? t('Validated') : t('Not Validated');
  const assignedDateStr = utcDateTimeFormatter.format(new Date(assignedOn));

  const RowActions = (t: TFunction): IAction[] => [
    {
      title: t('View configurations'),
      onClick: () => {
        setPolicy(policy, ModalViewContext.POLICY_CONFIGURATON_VIEW);
        setModalContext(ModalViewContext.POLICY_CONFIGURATON_VIEW);
      },
    },
    {
      title: t('Unassign policy'),
      onClick: () => {
        setPolicy(policy, ModalViewContext.UNASSIGN_POLICY_VIEW);
        setModalContext(ModalViewContext.UNASSIGN_POLICY_VIEW);
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
        <StatusIconAndText
          title={status}
          icon={
            isValidated ? (
              <GreenCheckCircleIcon />
            ) : (
              <RedExclamationCircleIcon />
            )
          }
        />
      </Td>
      <Td translate={null} dataLabel={columnNames[3]}>
        <Text className={!activity ? 'text-muted' : ''}>
          {!!activity ? activity : t('No activity')}
        </Text>
      </Td>
      <Td translate={null} dataLabel={columnNames[4]}>
        {assignedDateStr}
      </Td>
      <Td translate={null} isActionCell>
        <ActionsColumn
          items={RowActions(t)}
          isDisabled={!!policy?.metadata?.deletionTimestamp}
        />
      </Td>
    </>
  );
};

export const PolicyListViewTable: React.FC<PolicyListViewTableProps> = ({
  policies,
  selectedPolicies,
  modalActionContext,
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
    <div className="mco-manage-policies__listViewTable--padding">
      <SelectableTable<DataPolicyType>
        columns={columns}
        rows={policies}
        RowComponent={PolicyListViewTableRow}
        selectedRows={selectedPolicies}
        setSelectedRows={setSelectedRowList}
        extraProps={{
          setPolicy,
          setModalContext,
        }}
      />
    </div>
  );
};

type RowExtraProps = {
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
