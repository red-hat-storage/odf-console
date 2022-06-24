import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useSelectList } from '@odf/shared/hooks/select-list';
import { getName, getNamespace, getUID } from '@odf/shared/selectors';
import { referenceForModel } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageFilter,
  ResourceLink,
  RowProps,
  TableColumn,
  TableData,
  useK8sWatchResource,
  useListPageFilter,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Checkbox,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { NooBaaBackingStoreModel } from '../../models';
import { BackingStoreKind, PlacementPolicy } from '../../types';
import {
  getMCGStoreType,
  getBSLabel,
  getBucketName,
  getRegion,
} from '../../utils';
import './_backingstore-table.scss';

const tableColumnInfo = [
  { className: '', id: 'checkbox' },
  { className: '', id: 'name' },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-sm'),
    id: 'bucketname',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-sm'),
    id: 'backingStoreType',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-sm'),
    id: 'regions',
  },
];

type CustomData = {
  selectedData: any;
  onSelect: any;
};

const RowRenderer: React.FC<RowProps<BackingStoreKind, CustomData>> = ({
  obj,
  activeColumnIDs,
  rowData: { selectedData, onSelect },
}) => {
  const isChecked = selectedData ? selectedData.has(obj.metadata.uid) : false;
  const onChange = (checked: boolean) =>
    onSelect(null, checked, 0, { props: { id: obj.metadata.uid } });

  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        <Checkbox
          label=""
          isChecked={isChecked}
          onChange={onChange}
          id={`${obj.metadata.name}-checkbox`}
        />
      </TableData>

      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        <ResourceLink
          linkTo={false}
          kind={referenceForModel(NooBaaBackingStoreModel)}
          name={getName(obj)}
          namespace={getNamespace(obj)}
        />
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        {getBucketName(obj)}
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        {getMCGStoreType(obj)}
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        {getRegion(obj)}
      </TableData>
    </>
  );
};

type BackingStoreListProps = {
  data: BackingStoreKind[];
  unfilteredData: BackingStoreKind[];
  loaded: boolean;
  loadError: any;
  rowData: any;
};

const BackingStoreList: React.FC<BackingStoreListProps> = (props) => {
  const { t } = useTranslation();

  const columns = React.useMemo<TableColumn<BackingStoreKind>[]>(
    () => [
      {
        title: '',
        props: {
          className: tableColumnInfo[0].className,
        },
        id: tableColumnInfo[0].id,
      },
      {
        title: t('plugin__odf-console~Name'),
        props: {
          className: tableColumnInfo[1].className,
        },
        id: tableColumnInfo[1].id,
      },
      {
        title: t('plugin__odf-console~BucketName'),
        props: {
          className: tableColumnInfo[2].className,
        },
        id: tableColumnInfo[2].id,
      },
      {
        title: t('plugin__odf-console~Type'),
        props: {
          className: tableColumnInfo[3].className,
        },
        id: tableColumnInfo[3].id,
      },
      {
        title: t('plugin__odf-console~Region'),
        props: {
          className: tableColumnInfo[3].className,
        },
        id: tableColumnInfo[3].id,
      },
    ],
    [t]
  );

  return (
    <VirtualizedTable
      {...props}
      aria-label={t('plugin__odf-console~BackingStores')}
      columns={columns}
      Row={RowRenderer}
    />
  );
};

type BackingStoreListWrapperProps = {
  onSelectBackingStore: any;
  unSelectableResources: string[]; // An array of UIDs
  preSelectedResources: string[];
};

const BackingStoreListWrapper: React.FC<BackingStoreListWrapperProps> = ({
  onSelectBackingStore,
  unSelectableResources = [],
  preSelectedResources,
}) => {
  const [resources, loaded, loadError] = useK8sWatchResource<
    BackingStoreKind[]
  >({
    kind: referenceForModel(NooBaaBackingStoreModel),
    isList: true,
    namespace: CEPH_STORAGE_NAMESPACE,
  });

  const memoizedResources = useDeepCompareMemoize(resources, true);
  const availableData = memoizedResources.filter(
    (resource) => !unSelectableResources.includes(resource.metadata.uid)
  );

  const [data, filteredData, onFilterChange] = useListPageFilter(availableData);

  const { onSelect, selectedRows } = useSelectList<BackingStoreKind>(
    data,
    new Set(preSelectedResources),
    onSelectBackingStore
  );

  return (
    <>
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded}
          onFilterChange={onFilterChange}
          hideColumnManagement
        />
        <BackingStoreList
          data={filteredData}
          unfilteredData={data}
          loaded={loaded}
          loadError={loadError}
          rowData={{ selectedData: selectedRows, onSelect }}
        />
      </ListPageBody>
    </>
  );
};

type BackingStoreSelectionProps = {
  selectedTierA: BackingStoreKind[];
  setSelectedTierA: (arg: BackingStoreKind[]) => void;
  selectedTierB: BackingStoreKind[];
  setSelectedTierB: (arg: BackingStoreKind[]) => void;
  tier1Policy: PlacementPolicy;
  tier2Policy: PlacementPolicy;
  hideCreateBackingStore?: boolean;
  launchModal?: () => void;
};

const BackingStoreSelection: React.FC<BackingStoreSelectionProps> = (props) => {
  const {
    tier1Policy,
    tier2Policy,
    setSelectedTierA,
    setSelectedTierB,
    hideCreateBackingStore = false,
    launchModal,
  } = props;

  const { t } = useTranslation();

  const selectedTierA = props.selectedTierA.map(getUID);
  const selectedTierB = props.selectedTierB.map(getUID);

  return (
    <>
      <Form
        className={classNames('nb-bc-step-page-form', {
          'nb-bc-step-page-form--margin': !!tier2Policy,
        })}
      >
        {!!tier2Policy && (
          <Alert
            className="co-alert"
            variant="info"
            title={t(
              'plugin__odf-console~Each BackingStore can be used for one tier at a time. Selecting a BackingStore in one tier will remove the resource from the second tier option and vice versa.'
            )}
            aria-label={t(
              "plugin__odf-console~Bucket created for OpenShift Data Foundation's Service"
            )}
            isInline
          />
        )}
        <Title
          headingLevel="h3"
          size="xl"
          className="nb-bc-step-page-form__title"
        >
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            <Title headingLevel="h3" size="xl">
              {t('plugin__odf-console~Tier 1 - BackingStores')}{' '}
              {tier1Policy ? `(${tier1Policy})` : ''}
            </Title>
            {!hideCreateBackingStore && (
              <FlexItem>
                <Button
                  variant="link"
                  onClick={launchModal}
                  className="nb-bc-step-page-form__modal-launcher"
                >
                  <PlusCircleIcon />{' '}
                  {t('plugin__odf-console~Create BackingStore ')}
                </Button>
              </FlexItem>
            )}
          </Flex>
        </Title>

        <FormGroup
          className="nb-bc-step-page-form__element"
          fieldId="bs-1"
          label={getBSLabel(tier1Policy, t)}
          isRequired
        >
          <BackingStoreListWrapper
            unSelectableResources={selectedTierB}
            onSelectBackingStore={setSelectedTierA}
            preSelectedResources={selectedTierA}
          />
        </FormGroup>
        <p className="nb-create-bc-step-page-form__element--light-text">
          {t('{{bs, number}} BackingStore', {
            bs: selectedTierA.length,
            count: selectedTierA.length,
          })}{' '}
          {t('selected')}
        </p>
      </Form>
      {!!tier2Policy && (
        <Form className="nb-bc-step-page-form">
          <Title headingLevel="h3" size="xl">
            {t('plugin__odf-console~Tier 2 - BackingStores')}{' '}
            {tier2Policy ? `(${tier2Policy})` : ''}
          </Title>
          <FormGroup
            className="nb-bc-step-page-form__element"
            fieldId="bs-2"
            label={getBSLabel(tier2Policy, t)}
            isRequired
          >
            <BackingStoreListWrapper
              unSelectableResources={selectedTierA}
              onSelectBackingStore={setSelectedTierB}
              preSelectedResources={selectedTierB}
            />
          </FormGroup>
          <p className="nb-create-bc-step-page-form__element--light-text">
            {t('{{bs, number}} BackingStore ', {
              bs: selectedTierB.length,
              count: selectedTierB.length,
            })}{' '}
            {t('selected')}
          </p>
        </Form>
      )}
    </>
  );
};

export default BackingStoreSelection;
