import * as React from 'react';
import {
  K8sResourceCommon,
  ListPageFilterProps,
  ListPageBody,
  ListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Pagination,
  PaginationVariant,
  PaginationProps,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { TableProps, ComposableTable } from '../table';
import { getPageRange, getValidFilteredData } from '../utils';

const INITIAL_PAGE_NUMBER = 1;
const COUNT_PER_PAGE_NUMBER = 10;

export type PaginatedListPageProps = {
  countPerPage?: number;
  filteredData: K8sResourceCommon[] | unknown[];
  CreateButton?: React.FC<unknown>;
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
};

export const PaginatedListPage: React.FC<PaginatedListPageProps> = ({
  countPerPage,
  filteredData,
  CreateButton,
  Alerts,
  noData,
  hideFilter,
  listPageFilterProps,
  composableTableProps,
  paginationProps,
}) => {
  const [page, setPage] = React.useState(INITIAL_PAGE_NUMBER);
  const [perPage, setPerPage] = React.useState(
    countPerPage || COUNT_PER_PAGE_NUMBER
  );

  const paginatedData: K8sResourceCommon[] | unknown[] = React.useMemo(() => {
    const [start, end] = getPageRange(page, perPage);
    return filteredData.slice(start, end) || [];
  }, [filteredData, page, perPage]);

  return (
    <ListPageBody>
      {!noData && (
        <>
          <Grid>
            <GridItem md={8} sm={12} className="pf-v6-u-mt-md">
              <div className="pf-v6-u-display-flex pf-v6-u-flex-direction-column pf-v6-u-flex-direction-row-on-md">
                {!hideFilter && (
                  <ListPageFilter
                    {...listPageFilterProps}
                    data={getValidFilteredData(listPageFilterProps.data)}
                  />
                )}
                {!!CreateButton && <CreateButton />}
              </div>
            </GridItem>
            <GridItem md={4} sm={12}>
              <Pagination
                variant={PaginationVariant.bottom}
                dropDirection="up"
                perPageOptions={[]}
                isStatic
                className="pf-v6-u-mt-md"
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
            </GridItem>
          </Grid>
          {!!Alerts && <Alerts />}
        </>
      )}
      <ComposableTable {...composableTableProps} rows={paginatedData} />
    </ListPageBody>
  );
};
