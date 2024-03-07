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
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { TableProps, ComposableTable } from '../table';
import { getPageRange, getValidFilteredData } from '../utils';

const INITIAL_PAGE_NUMBER = 1;
const COUNT_PER_PAGE_NUMBER = 10;

export type PaginatedsListPageProps = {
  countPerPage?: number;
  filteredData: K8sResourceCommon[];
  CreateButton: React.FC<unknown>;
  Alerts?: React.FC<unknown>;
  noData?: boolean;
  listPageFilterProps: ListPageFilterProps;
  composableTableProps: Omit<TableProps<K8sResourceCommon>, 'rows'>;
};

export const PaginatedsListPage: React.FC<PaginatedsListPageProps> = ({
  countPerPage,
  filteredData,
  CreateButton,
  Alerts,
  noData,
  listPageFilterProps,
  composableTableProps,
}) => {
  const [page, setPage] = React.useState(INITIAL_PAGE_NUMBER);
  const [perPage, setPerPage] = React.useState(
    countPerPage || COUNT_PER_PAGE_NUMBER
  );

  const paginatedData: K8sResourceCommon[] = React.useMemo(() => {
    const [start, end] = getPageRange(page, perPage);
    return filteredData.slice(start, end) || [];
  }, [filteredData, page, perPage]);

  return (
    <ListPageBody>
      {!noData && (
        <>
          <Grid>
            <GridItem md={8} sm={12}>
              <div className="pf-u-display-flex pf-u-flex-direction-column pf-u-flex-direction-row-on-md">
                <ListPageFilter
                  {...listPageFilterProps}
                  data={getValidFilteredData(listPageFilterProps.data)}
                />
                <CreateButton />
              </div>
            </GridItem>
            <GridItem md={4} sm={12}>
              <Pagination
                itemCount={filteredData.length || 0}
                widgetId="paginated-list-page"
                perPage={perPage}
                page={page}
                variant={PaginationVariant.bottom}
                dropDirection="up"
                perPageOptions={[]}
                isStatic
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
