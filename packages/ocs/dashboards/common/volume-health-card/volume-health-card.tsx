import * as React from 'react';
import { useGetClusterDetails } from '@odf/core/redux/utils';
import { namespaceResource } from '@odf/core/resources';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import {
  NamespaceModel,
  PersistentVolumeClaimModel,
  StorageClassModel,
} from '@odf/shared/models';
import { getAnnotations, getName, getNamespace } from '@odf/shared/selectors';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
} from '@odf/shared/status';
import Table, { Column } from '@odf/shared/table/table';
import {
  PersistentVolumeClaimKind,
  StorageClassResourceKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ALL_NAMESPACES_KEY, resourcePathFromModel } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Link } from 'react-router-dom-v5-compat';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Pagination,
  PaginationVariant,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { SortByDirection } from '@patternfly/react-table';

const VOLUME_HEALTH_ANNOTATION_PREFIX = 'csiaddons.openshift.io/volumehealth.';
const PVC_LIST_PATH = resourcePathFromModel(PersistentVolumeClaimModel);
const DEFAULT_PER_PAGE = 5;

const allNamespacesResource = {
  metadata: {
    name: ALL_NAMESPACES_KEY,
  },
} as K8sResourceCommon;

const getInitialSelection = () => allNamespacesResource;

export enum VolumeHealthState {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
}

type VolumeHealthAnnotation = {
  state: VolumeHealthState;
  lastChecked?: string;
  since?: string;
  node?: string;
};

type VolumeHealthRow = {
  pvcName: string;
  namespace: string;
  nodeName: string;
  uniqueKey: string;
};

const nameSort = (
  a: VolumeHealthRow,
  b: VolumeHealthRow,
  direction: SortByDirection
) => {
  const sortValue =
    a.pvcName.localeCompare(b.pvcName) || a.nodeName.localeCompare(b.nodeName);
  return direction === SortByDirection.asc ? sortValue : -sortValue;
};

const getUnhealthyRows = (
  pvc: PersistentVolumeClaimKind,
  pvcFilter: (pvcData: PersistentVolumeClaimKind) => boolean
): VolumeHealthRow[] => {
  if (!pvcFilter(pvc)) {
    return [];
  }

  const pvcName = getName(pvc);
  const namespace = getNamespace(pvc);
  const annotations = getAnnotations(pvc, {});

  return Object.entries(annotations).reduce((acc, [key, value]) => {
    if (!key.startsWith(VOLUME_HEALTH_ANNOTATION_PREFIX)) {
      return acc;
    }

    try {
      const parsedValue = JSON.parse(value) as VolumeHealthAnnotation;
      if (parsedValue.state !== VolumeHealthState.UNHEALTHY) {
        return acc;
      }

      const nodeName =
        parsedValue.node || key.replace(VOLUME_HEALTH_ANNOTATION_PREFIX, '');
      return [
        ...acc,
        {
          pvcName,
          namespace,
          nodeName,
          uniqueKey: `${namespace}-${pvcName}-${nodeName}`,
        },
      ];
    } catch {
      return acc;
    }
  }, []);
};

const getRow = (
  row: VolumeHealthRow,
  viewEventsText: string
): [React.ReactNode, React.ReactNode, React.ReactNode] => {
  const pvcPath = `/k8s/ns/${row.namespace}/persistentvolumeclaims/${row.pvcName}`;
  const pvcEventsPath = `${pvcPath}/events`;
  const nodePath = `/k8s/cluster/nodes/${row.nodeName}`;

  return [
    <Link key={`${row.uniqueKey}-name`} to={pvcPath}>
      {row.pvcName}
    </Link>,
    <Link key={`${row.uniqueKey}-node`} to={nodePath}>
      {row.nodeName}
    </Link>,
    <Link key={`${row.uniqueKey}-events`} to={pvcEventsPath}>
      <Flex
        spaceItems={{ default: 'spaceItemsSm' }}
        alignItems={{ default: 'alignItemsCenter' }}
      >
        <FlexItem>
          <ExternalLinkAltIcon />
        </FlexItem>
        <FlexItem>{viewEventsText}</FlexItem>
      </Flex>
    </Link>,
  ];
};

type VolumeHealthCardProps = {
  pvcFilter?: (
    scs: StorageClassResourceKind[],
    pvcs: PersistentVolumeClaimKind[],
    ns: string
  ) => (pvc: PersistentVolumeClaimKind) => boolean;
};

export const VolumeHealthCard: React.FC<VolumeHealthCardProps> = ({
  pvcFilter = () => () => true,
}) => {
  const { t } = useCustomTranslation();

  const [selectedNamespace, setSelectedNamespace] =
    React.useState<string>(ALL_NAMESPACES_KEY);
  const [page, setPage] = React.useState(1);

  const [pvcs = [], pvcLoaded, pvcLoadError] = useK8sWatchResource<
    PersistentVolumeClaimKind[]
  >({
    isList: true,
    kind: PersistentVolumeClaimModel.kind,
    ...(selectedNamespace !== ALL_NAMESPACES_KEY
      ? { namespace: selectedNamespace }
      : {}),
  });
  const [scs = [], scLoaded, scLoadError] = useK8sWatchResource<
    StorageClassResourceKind[]
  >({
    isList: true,
    kind: StorageClassModel.kind,
  });

  const loaded = pvcLoaded && scLoaded;
  const loadError = pvcLoadError || scLoadError;

  const { clusterNamespace: clusterNs } = useGetClusterDetails();

  const { unhealthyRows, unhealthyPVCCount } = React.useMemo(() => {
    const filter = pvcFilter(scs, pvcs, clusterNs);

    const rows = pvcs.reduce(
      (acc, pvc) => [...acc, ...getUnhealthyRows(pvc, filter)],
      [] as VolumeHealthRow[]
    );

    const pvcCount = new Set(
      rows.map((row) => `${row.namespace}/${row.pvcName}`)
    ).size;

    return {
      unhealthyRows: rows,
      unhealthyPVCCount: pvcCount,
    };
  }, [pvcs, scs, clusterNs, pvcFilter]);

  const maxPage = Math.max(
    1,
    Math.ceil(unhealthyRows.length / DEFAULT_PER_PAGE)
  );
  const activePage = Math.min(page, maxPage);

  const paginatedRows = React.useMemo(() => {
    const startIndex = (activePage - 1) * DEFAULT_PER_PAGE;
    return unhealthyRows.slice(startIndex, startIndex + DEFAULT_PER_PAGE);
  }, [unhealthyRows, activePage]);

  const { columns, rowRenderer } = React.useMemo(
    () => ({
      columns: [
        {
          columnName: t('Name'),
          sortFunction: nameSort,
        },
        {
          columnName: t('Node'),
        },
        {
          columnName: '',
        },
      ] as Column[],
      rowRenderer: (row: VolumeHealthRow) => getRow(row, t('View events')),
    }),
    [t]
  );

  return (
    <Card data-test="odf-volume-health-card">
      <CardHeader>
        <Flex
          className="pf-v6-u-w-100"
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <CardTitle>{t('Volume health')}</CardTitle>
          </FlexItem>
          <FlexItem>
            <ResourceDropdown<K8sResourceCommon>
              resource={namespaceResource}
              resourceModel={NamespaceModel}
              showBadge={true}
              initialSelection={getInitialSelection}
              extraDropdownItems={[allNamespacesResource]}
              propertySelector={(resource) =>
                getName(resource) === ALL_NAMESPACES_KEY
                  ? t('All Namespaces')
                  : getName(resource)
              }
              onSelect={(namespace) => {
                setSelectedNamespace(getName(namespace));
                setPage(1);
              }}
              data-test="odf-volume-health-card-namespace-dropdown"
            />
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody>
        {!loaded && (
          <Table
            columns={columns}
            rawData={[] as []}
            rowRenderer={rowRenderer as any}
            loaded={false}
            loadError={null}
            ariaLabel={t('Volume health table skeleton')}
          />
        )}
        {loaded && loadError && <DataUnavailableError />}
        {loaded && !loadError && unhealthyRows.length === 0 && (
          <EmptyState
            icon={GreenCheckCircleIcon}
            titleText={t('No issues found.')}
          >
            <EmptyStateBody>
              <Link to={PVC_LIST_PATH}>
                {t('View all PersistentVolumeClaims')}
              </Link>
            </EmptyStateBody>
          </EmptyState>
        )}
        {loaded && !loadError && unhealthyRows.length > 0 && (
          <>
            <Flex
              className="pf-v6-u-mb-md"
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsMd' }}
            >
              <FlexItem>
                <RedExclamationCircleIcon />
              </FlexItem>
              <FlexItem>
                {t('{{count}} PersistentVolumeClaims need attention', {
                  count: unhealthyPVCCount,
                })}
              </FlexItem>
            </Flex>
            <Table
              columns={columns}
              rawData={paginatedRows as []}
              rowRenderer={rowRenderer as any}
              loaded={loaded}
              loadError={loadError}
              ariaLabel={t('Volume health table')}
            />
            <Pagination
              variant={PaginationVariant.bottom}
              itemCount={unhealthyRows.length}
              page={activePage}
              perPage={DEFAULT_PER_PAGE}
              perPageOptions={[]}
              onSetPage={(_event, newPage) => setPage(newPage)}
            />
          </>
        )}
      </CardBody>
    </Card>
  );
};
