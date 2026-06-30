import * as React from 'react';
import {
  K8sResourceCommon,
  ListPageFilterProps,
  ListPageBody,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Pagination,
  PaginationVariant,
  PaginationProps,
} from '@patternfly/react-core';
import { ListPageFilterWrapper } from '../sdk-wrapper/ListPageFilterWrapper';
import { TableProps, ComposableTable } from '../table';
import { getPageRange, getValidFilteredData } from '../utils';

const INITIAL_PAGE_NUMBER = 1;
const COUNT_PER_PAGE_NUMBER = 10;

export type PaginatedListPageProps = {
  countPerPage?: number;
  filteredData: K8sResourceCommon[] | unknown[];
  CreateButton?: React.FC<unknown>;
  toolbarActions?: React.ReactNode;
  Alerts?: React.FC<unknown>;
  noData?: boolean;
  hideFilter?: boolean;
  listPageFilterProps?: ListPageFilterProps;
  composableTableProps: Omit<TableProps<K8sResourceCommon>, 'rows'>;
  paginationProps?: Omit<
    PaginationProps,
    | 'itemCount'
    | 'widgetId'
    | 'perPage'
    | 'page'
    | 'onSetPage'
    | 'onPerPageSelect'
  >;
  onPaginatedDataChange?: (paginatedData: K8sResourceCommon[]) => void;
};

export const PaginatedListPage: React.FC<PaginatedListPageProps> = ({
  countPerPage,
  filteredData,
  CreateButton,
  toolbarActions,
  Alerts,
  noData,
  hideFilter,
  listPageFilterProps,
  composableTableProps,
  paginationProps,
  onPaginatedDataChange,
}) => {
  const [page, setPage] = React.useState(INITIAL_PAGE_NUMBER);
  const [perPage, setPerPage] = React.useState(
    countPerPage || COUNT_PER_PAGE_NUMBER
  );

  const paginatedData: K8sResourceCommon[] | unknown[] = React.useMemo(() => {
    const [start, end] = getPageRange(page, perPage);
    return filteredData.slice(start, end) || [];
  }, [filteredData, page, perPage]);

  React.useEffect(() => {
    onPaginatedDataChange?.(paginatedData as K8sResourceCommon[]);
  }, [paginatedData, onPaginatedDataChange]);

  return (
    <ListPageBody>
      {!noData && (
        <>
          <div className="pf-v6-u-display-flex pf-v6-u-justify-content-space-between pf-v6-u-align-items-center pf-v6-u-flex-wrap pf-v6-u-mt-md">
            <div
              className="pf-v6-u-display-flex pf-v6-u-align-items-flex-start pf-v6-u-flex-wrap"
              style={{
                flex: '1 1 0',
                minWidth: 0,
                gap: 'var(--pf-t--global--spacer--md)',
              }}
            >
              {toolbarActions}
              {!hideFilter && (
                <ListPageFilterWrapper
                  {...listPageFilterProps}
                  data={getValidFilteredData(listPageFilterProps.data)}
                />
              )}
              {!!CreateButton && <CreateButton />}
            </div>
            <Pagination
              variant={PaginationVariant.bottom}
              dropDirection="up"
              perPageOptions={[]}
              isStatic
              {...(!!paginationProps ? paginationProps : {})}
              itemCount={filteredData.length || 0}
              widgetId="paginated-list-page"
              perPage={perPage}
              page={page}
              onSetPage={(_event, newPage) => setPage(newPage)}
              onPerPageSelect={(_event, newPerPage, newPage) => {
                setPerPage(newPerPage);
                setPage(newPage);
              }}
            />
          </div>
          {!!Alerts && <Alerts />}
        </>
      )}
      <ComposableTable {...composableTableProps} rows={paginatedData} />
    </ListPageBody>
  );
};
