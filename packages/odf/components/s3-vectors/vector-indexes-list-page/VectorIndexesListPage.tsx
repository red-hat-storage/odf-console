import * as React from 'react';
import { getVectorBucketOverviewBaseRoute } from '@odf/core/constants/s3-vectors';
import type { VectorIndexesDeleteResponse } from '@odf/core/modals/s3-vectors/delete-vector-index/DeleteVectorIndexModal';
import { S3ProviderType } from '@odf/core/types';
import { useCustomTranslation } from '@odf/shared';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { getValidFilteredData } from '@odf/shared/utils';
import {
  useListPageFilter,
  ListPageFilter,
  OnFilterChange,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { useNavigate, useParams } from 'react-router-dom-v5-compat';
import {
  Alert,
  AlertActionCloseButton,
  AlertVariant,
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { VectorIndexesListTable } from './VectorIndexesListTable';
import { VectorIndexesPagination } from './VectorIndexesPagination';

type VectorIndexListType = {
  obj: {
    fresh: boolean;
    triggerRefresh: () => void;
    vectorBucketName: string;
    s3VectorsClient: S3VectorsCommands;
  };
};

const getVectorIndexCreateRoute = (
  vectorBucketName: string,
  providerType: S3ProviderType
) =>
  `${getVectorBucketOverviewBaseRoute(vectorBucketName, providerType)}/create-index`;

type TableActionsProps = {
  loadedWOError: boolean;
  vectorBucketName: string;
  providerType: S3ProviderType;
  allVectorIndexes: K8sResourceCommon[];
  onFilterChange: OnFilterChange;
};

const TableActions: React.FC<TableActionsProps> = ({
  loadedWOError,
  vectorBucketName,
  providerType,
  allVectorIndexes,
  onFilterChange,
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();

  return (
    <Flex flex={{ default: 'flex_1' }}>
      <FlexItem className="pf-v6-u-mr-md pf-v6-u-display-flex pf-v6-u-align-items-center">
        <ListPageFilter
          loaded={true}
          hideLabelFilter={true}
          nameFilterPlaceholder={t('Find by name')}
          data={getValidFilteredData(allVectorIndexes)}
          onFilterChange={onFilterChange}
        />
      </FlexItem>
      <FlexItem className="pf-v6-u-display-flex pf-v6-u-align-items-center">
        <Button
          variant={ButtonVariant.primary}
          isDisabled={!loadedWOError}
          onClick={() =>
            navigate(getVectorIndexCreateRoute(vectorBucketName, providerType))
          }
        >
          {t('Create index')}
        </Button>
      </FlexItem>
    </Flex>
  );
};

const VectorIndexesListPage: React.FC<VectorIndexListType> = ({ obj }) => {
  const { t } = useCustomTranslation();
  const { fresh, triggerRefresh, vectorBucketName, s3VectorsClient } = obj;
  const { providerType } = useParams();

  const [vectorIndexInfo, setVectorIndexInfo] = React.useState<
    [K8sResourceCommon[], boolean, Error | undefined]
  >([[], false, undefined]);

  const [deleteResponse, setDeleteResponse] =
    React.useState<VectorIndexesDeleteResponse>({
      deletedIndexName: null,
    });

  const [rows, loaded, loadError] = vectorIndexInfo;
  const [allVectorIndexes, filteredVectorIndexes, onFilterChange] =
    useListPageFilter(rows);

  return (
    <>
      {!!deleteResponse.deletedIndexName && (
        <Alert
          isInline
          variant={AlertVariant.success}
          title={t('Vector index {{indexName}} was deleted.', {
            indexName: deleteResponse.deletedIndexName,
          })}
          actionClose={
            <AlertActionCloseButton
              onClose={() => setDeleteResponse({ deletedIndexName: null })}
            />
          }
          className="pf-v6-u-mt-md"
        />
      )}
      <Flex className="pf-v6-u-mt-md">
        <TableActions
          loadedWOError={loaded && !loadError}
          vectorBucketName={vectorBucketName}
          providerType={providerType as S3ProviderType}
          allVectorIndexes={allVectorIndexes}
          onFilterChange={onFilterChange}
        />
        <FlexItem>
          {fresh && (
            <VectorIndexesPagination
              vectorBucketName={vectorBucketName}
              setVectorIndexInfo={setVectorIndexInfo}
            />
          )}
        </FlexItem>
      </Flex>
      {fresh && (
        <VectorIndexesListTable
          allVectorIndexes={allVectorIndexes}
          filteredVectorIndexes={filteredVectorIndexes}
          loaded={loaded}
          error={loadError}
          vectorBucketName={vectorBucketName}
          s3VectorsClient={s3VectorsClient}
          triggerRefresh={triggerRefresh}
          setDeleteResponse={setDeleteResponse}
        />
      )}
    </>
  );
};

export default VectorIndexesListPage;
