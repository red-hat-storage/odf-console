import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { screen, render, fireEvent, waitFor } from '@testing-library/react';
import { ActionsColumn, IAction, Td } from '@patternfly/react-table';
import { getName, getNamespace } from '../selectors';
import { RowComponentType } from './composable-table';
import { SelectableTable } from './selectable-table';

const getRow = (): K8sResourceCommon[] => [
  {
    metadata: {
      uid: '1',
      name: 'name1',
      namespace: 'namespace1',
    },
    kind: 'kind1',
  },
  {
    metadata: {
      uid: '2',
      deletionTimestamp: '2023-06-14T07:37:28Z',
      name: 'name2',
      namespace: 'namespace2',
    },
    kind: 'kind2',
  },
  {
    metadata: {
      uid: '3',
      name: 'name3',
      namespace: 'namespace3',
    },
    kind: 'kind3',
  },
];

const getColumns = () => [
  { columnName: 'name' },
  { columnName: 'namespace' },
  { columnName: 'kind' },
  { columnName: '' },
];

const RowActions = (): IAction[] => [
  {
    title: 'test action',
    onClick: jest.fn(),
  },
];

const MockRowComponent: React.FC<RowComponentType<K8sResourceCommon>> = (
  props
) => {
  const { row } = props;

  return (
    <>
      <Td translate={null}> {getName(row)} </Td>
      <Td translate={null}> {getNamespace(row)} </Td>
      <Td translate={null}> {row?.kind} </Td>
      <Td translate={null} isActionCell>
        <ActionsColumn translate={null} items={RowActions()} />
      </Td>
    </>
  );
};

describe('ApplicationSet manage data policy modal', () => {
  test('selectable table test', async () => {
    let selectedRows: K8sResourceCommon[] = [];
    const mockFuncton = jest.fn((selectedRowList: K8sResourceCommon[]) => {
      selectedRows = selectedRowList;
    });
    render(
      <SelectableTable<K8sResourceCommon>
        RowComponent={MockRowComponent}
        columns={getColumns()}
        rows={getRow()}
        setSelectedRows={mockFuncton}
        selectedRows={selectedRows}
        loaded={true}
      />
    );

    // Header
    expect(screen.getByLabelText('Selectable table')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('namespace')).toBeInTheDocument();
    expect(screen.getByText('kind')).toBeInTheDocument();

    // Row1
    expect(screen.getByText('name1')).toBeInTheDocument();
    expect(screen.getByText('namespace1')).toBeInTheDocument();
    expect(screen.getByText('kind1')).toBeInTheDocument();

    // Row2
    expect(screen.getByText('name2')).toBeInTheDocument();
    expect(screen.getByText('namespace2')).toBeInTheDocument();
    expect(screen.getByText('kind2')).toBeInTheDocument();

    // Row3
    expect(screen.getByText('name3')).toBeInTheDocument();
    expect(screen.getByText('namespace3')).toBeInTheDocument();
    expect(screen.getByText('kind3')).toBeInTheDocument();

    // Row action
    await waitFor(() =>
      fireEvent.click(
        screen.getAllByRole('button', {
          name: 'Kebab toggle',
        })[0]
      )
    );
    expect(screen.getByText('test action')).toBeInTheDocument();
  });

  test('select one row test', async () => {
    let selectedRows: K8sResourceCommon[] = [];
    const mockFuncton = jest.fn((selectedRowList: K8sResourceCommon[]) => {
      selectedRows = selectedRowList;
    });
    render(
      <SelectableTable<K8sResourceCommon>
        RowComponent={MockRowComponent}
        columns={getColumns()}
        rows={getRow()}
        setSelectedRows={mockFuncton}
        selectedRows={[]}
        loaded={true}
      />
    );
    // Select all rows
    const selectRow = screen.getByLabelText('Select row 0');
    fireEvent.click(selectRow);
    expect(selectedRows.length === 1).toBeTruthy();
  });

  test('select all row test', async () => {
    let selectedRows: K8sResourceCommon[] = [];
    const mockFuncton = jest.fn((selectedRowList: K8sResourceCommon[]) => {
      selectedRows = selectedRowList;
    });
    render(
      <SelectableTable<K8sResourceCommon>
        RowComponent={MockRowComponent}
        columns={getColumns()}
        rows={getRow()}
        setSelectedRows={mockFuncton}
        selectedRows={[]}
        loaded={true}
      />
    );
    // Select all rows
    const selectAll = screen.getByLabelText('Select all rows');
    fireEvent.click(selectAll);
    expect(selectedRows.length === 2).toBeTruthy();
  });

  test('No rows test', async () => {
    render(
      <SelectableTable<K8sResourceCommon>
        RowComponent={MockRowComponent}
        columns={getColumns()}
        rows={[]}
        setSelectedRows={jest.fn()}
        selectedRows={[]}
        loaded={true}
      />
    );
    expect(screen.getByText('Not found')).toBeInTheDocument();
  });
  test('Load error test', async () => {
    render(
      <SelectableTable<K8sResourceCommon>
        RowComponent={MockRowComponent}
        columns={getColumns()}
        rows={[]}
        setSelectedRows={jest.fn()}
        selectedRows={[]}
        loaded={true}
        loadError={{
          response: {
            status: 404,
          },
        }}
      />
    );
    expect(screen.getByText('404: Not Found')).toBeInTheDocument();
  });
});
