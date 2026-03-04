import * as React from 'react';
import { SAN_STORAGE_SYSTEM_NAME } from '@odf/core/constants';
import { FileSystemKind } from '@odf/core/types/scale';
import { DASH, getName, getNamespace } from '@odf/shared';
import { Kebab } from '@odf/shared/kebab';
import { ModalKeys } from '@odf/shared/modals';
import { FileSystemModel } from '@odf/shared/models/scale';
import { GreenCheckCircleIcon } from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { ExternalLink } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
  RowFilter,
  ListPageFilter,
  TableColumn,
  TableData,
  RowProps,
  useActiveColumns,
  VirtualizedTable,
  useListPageFilter,
  HealthState,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Link } from 'react-router-dom-v5-compat';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  pluralize,
  TextContent,
  TextVariants,
  Text,
  Tooltip,
} from '@patternfly/react-core';
import { InfoCircleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { sortable } from '@patternfly/react-table';
import { filterSANFileSystems } from '../ibm-common/utils';
import { useScaleGuiLink } from './useScaleGUILink';
import './LUNCard.scss';

const resource = {
  kind: referenceForModel(FileSystemModel),
  isList: true,
};

const isConnected = (fileSystem: FileSystemKind) => {
  return fileSystem.status?.conditions?.some(
    (condition) => condition.type === 'Success' && condition.status === 'True'
  );
};

const getLUNGroupStatus = (fileSystem: FileSystemKind): HealthState => {
  if (isConnected(fileSystem)) {
    return HealthState.OK;
  }
  return HealthState.ERROR;
};

const LUNGroupStatusIcon: React.FC<{
  fileSystems: FileSystemKind[];
  loading: boolean;
  loadError: boolean;
}> = ({ fileSystems, loading, loadError }) => {
  if (fileSystems?.length === 0 || loading || loadError) {
    return null;
  }
  const areAllLUNGroupsConnected = fileSystems.every((fileSystem) =>
    isConnected(fileSystem)
  );
  const isAnyLUNGroupConnected = fileSystems.some((fileSystem) =>
    isConnected(fileSystem)
  );
  if (areAllLUNGroupsConnected) {
    return <GreenCheckCircleIcon />;
  }
  if (isAnyLUNGroupConnected) {
    return <YellowExclamationTriangleIcon />;
  }
  return <RedExclamationCircleIcon />;
};

const getStorageClassName = (fileSystem: FileSystemKind): string => {
  return getName(fileSystem);
};

const getConsoleLink = (
  fileSystem: FileSystemKind,
  url: string
): string | undefined => {
  if (url === '-') return undefined;
  return `${url}-/${getName(fileSystem)}`;
};

const lunGroupStatusFilter = (t): RowFilter<FileSystemKind> => ({
  type: 'lun-group-status',
  filterGroupName: t('Status'),
  reducer: getLUNGroupStatus,
  items: [
    { id: HealthState.OK, title: t('Healthy') },
    { id: HealthState.ERROR, title: t('Unhealthy') },
  ],
  filter: (statuses, fileSystem) => {
    if (!statuses || !statuses.selected || _.isEmpty(statuses.selected)) {
      return true;
    }
    const status = getLUNGroupStatus(fileSystem);
    return (
      statuses.selected.includes(status) ||
      !_.includes(statuses.all, status) ||
      _.isEmpty(statuses.selected)
    );
  },
});

const tableColumnInfo = [
  { className: '', id: 'name' },
  { className: '', id: 'status' },
  { className: '', id: 'storageClasses' },
  { className: '', id: 'consoleLink' },
  { className: Kebab.columnClass, id: 'kebabColumn' },
];

type LUNGroupsListProps = {
  data: FileSystemKind[];
  unfilteredData: FileSystemKind[];
  loaded: boolean;
  loadError: any;
};

const LUNGroupsList: React.FC<LUNGroupsListProps> = ({ ...props }) => {
  const { t } = useCustomTranslation();
  const { url } = useScaleGuiLink();
  const lunGroupTableColumns = React.useMemo<TableColumn<FileSystemKind>[]>(
    () => [
      {
        title: t('Name'),
        sort: 'metadata.name',
        transforms: [sortable],
        props: {
          className: tableColumnInfo[0].className,
        },
        id: tableColumnInfo[0].id,
      },
      {
        title: t('Status'),
        transforms: [sortable],
        props: {
          className: tableColumnInfo[1].className,
        },
        id: tableColumnInfo[1].id,
      },
      {
        title: t('StorageClasses'),
        transforms: [sortable],
        props: {
          className: tableColumnInfo[2].className,
        },
        id: tableColumnInfo[2].id,
        header: (
          <span className="pf-v5-u-display-flex pf-v5-u-align-items-center">
            {t('StorageClasses')}
            <Tooltip content={t('StorageClasses information')}>
              <InfoCircleIcon className="pf-v5-u-ml-sm pf-v5-u-color-200" />
            </Tooltip>
          </span>
        ),
      },
      {
        title: t('Console link'),
        transforms: [sortable],
        props: {
          className: tableColumnInfo[3].className,
        },
        id: tableColumnInfo[3].id,
        header: (
          <span className="pf-v5-u-display-flex pf-v5-u-align-items-center">
            {t('Console link')}
            <Tooltip content={t('Console link information')}>
              <InfoCircleIcon className="pf-v5-u-ml-sm pf-v5-u-color-200" />
            </Tooltip>
          </span>
        ),
      },
      {
        title: '',
        transforms: [sortable],
        props: {
          className: tableColumnInfo[4].className,
        },
        id: tableColumnInfo[4].id,
      },
    ],
    [t]
  );

  const [columns] = useActiveColumns({
    columns: lunGroupTableColumns,
    showNamespaceOverride: false,
    columnManagementID: null,
  });

  return (
    <VirtualizedTable
      {...props}
      aria-label={t('LUN groups table')}
      columns={columns}
      Row={LUNGroupRow}
      rowData={{ url }}
    />
  );
};

type CustomData = { url: string };

const LUNGroupRow: React.FC<RowProps<FileSystemKind, CustomData>> = ({
  obj,
  activeColumnIDs,
  rowData: { url },
}) => {
  const { t } = useCustomTranslation();
  const status = getLUNGroupStatus(obj);
  const isHealthy = status === HealthState.OK;
  const storageClassName = getStorageClassName(obj);

  const customKebabItems = React.useMemo(
    () => [
      {
        key: ModalKeys.DELETE,
        value: t('Delete LUN group'),
        component: React.lazy(
          () => import('../../modals/lun-group/DeleteLUNModal')
        ),
      },
    ],
    [t]
  );

  const consoleLink = getConsoleLink(obj, url);

  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        <Link
          to={`/odf/external-systems/scale.spectrum.ibm.com~v1beta1~cluster/${SAN_STORAGE_SYSTEM_NAME}/filesystems/ns/${getNamespace(obj)}/${getName(obj)}`}
        >
          {getName(obj)}
        </Link>
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        <span className="pf-v5-u-display-flex pf-v5-u-align-items-center">
          {isHealthy && <GreenCheckCircleIcon className="pf-v5-u-mr-sm" />}
          {status}
        </span>
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        {storageClassName || DASH}
      </TableData>
      <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        {consoleLink ? (
          <div className="lun-card__console-link-wrap">
            <ExternalLink
              href={consoleLink}
              additionalClassName="lun-card__console-link pf-v5-u-display-inline-flex pf-v5-u-align-items-center"
            >
              <span className="lun-card__console-link-text" title={consoleLink}>
                {consoleLink}
              </span>
              <ExternalLinkAltIcon className="lun-card__console-link-icon pf-v5-u-ml-xs" />
            </ExternalLink>
          </div>
        ) : (
          DASH
        )}
      </TableData>
      <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
        <Kebab
          extraProps={{
            resource: obj,
            resourceModel: FileSystemModel,
          }}
          customKebabItems={customKebabItems}
        />
      </TableData>
    </>
  );
};

const LUNGroupsTable: React.FC = () => {
  const { t } = useCustomTranslation();
  const [fileSystems, fileSystemsLoaded, fileSystemsLoadError] =
    useK8sWatchResource<FileSystemKind[]>(resource);
  const filteredFileSystems = filterSANFileSystems(fileSystems);
  const connectedLUNGroups = filteredFileSystems?.filter((fileSystem) =>
    isConnected(fileSystem)
  );

  const rowFilters = React.useMemo(() => [lunGroupStatusFilter(t)], [t]);

  const [data, filteredData, onFilterChange] = useListPageFilter(
    filteredFileSystems || [],
    rowFilters
  );

  return (
    <div>
      <TextContent className="pf-v5-u-my-xl">
        <Text component={TextVariants.h2}>
          <span className="pf-v5-u-mr-sm">
            <LUNGroupStatusIcon
              fileSystems={filteredFileSystems || []}
              loading={!fileSystemsLoaded}
              loadError={!!fileSystemsLoadError}
            />
          </span>
          {t('{{ lunGroups }} connected', {
            lunGroups: pluralize(
              connectedLUNGroups?.length || 0,
              t('LUN group')
            ),
          })}
        </Text>
      </TextContent>
      <ListPageFilter
        data={data}
        loaded={fileSystemsLoaded}
        onFilterChange={onFilterChange}
        rowFilters={rowFilters}
        hideColumnManagement={true}
      />
      <LUNGroupsList
        data={filteredData}
        unfilteredData={filteredFileSystems || []}
        loaded={fileSystemsLoaded}
        loadError={fileSystemsLoadError}
      />
    </div>
  );
};

const LUNCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('LUN group')}</CardTitle>
      </CardHeader>
      <CardBody>
        <LUNGroupsTable />
      </CardBody>
    </Card>
  );
};

export default LUNCard;
