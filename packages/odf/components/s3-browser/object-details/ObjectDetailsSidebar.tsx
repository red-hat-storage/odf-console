import * as React from 'react';
import {
  Tag,
  DeleteObjectsCommandOutput,
  ObjectLockRetentionMode,
  ObjectLockLegalHoldStatus,
} from '@aws-sdk/client-s3';
import { S3Context } from '@odf/core/components/s3-browser/s3-context';
import {
  OBJECT_CACHE_KEY_SUFFIX,
  OBJECT_TAGGING_CACHE_KEY_SUFFIX,
  OBJECT_RETENTION_CACHE_KEY_SUFFIX,
  OBJECT_LEGAL_HOLD_CACHE_KEY_SUFFIX,
  BUCKET_OBJECT_LOCK_CACHE_KEY_SUFFIX,
  PREFIX,
} from '@odf/core/constants';
import LegalHoldModal, {
  LegalHoldModalProps,
} from '@odf/core/modals/s3-browser/legal-hold/LegalHoldModal';
import ObjectLockNotEnabledModal, {
  ObjectLockNotEnabledModalProps,
} from '@odf/core/modals/s3-browser/set-object-lock-and-retention/ObjectLockNotEnabledModal';
import SetObjectRetentionModal, {
  SetObjectRetentionModalProps,
} from '@odf/core/modals/s3-browser/set-object-lock-and-retention/SetObjectRetentionModal';
import { ObjectCrFormat } from '@odf/core/types';
import {
  replacePathFromName,
  getObjectVersionId,
  convertObjectDataToCrFormat,
  sortByLastModified,
  isObjectDeepArchived,
  isObjectRestored,
  getRestoreStatusText,
} from '@odf/core/utils';
import {
  DASH,
  DrawerHead,
  getName,
  LoadingBox,
  useCustomTranslation,
} from '@odf/shared';
import { useModalWrapper } from '@odf/shared';
import { PaginatedListPage } from '@odf/shared/list-page';
import { S3Commands } from '@odf/shared/s3';
import {
  getIsObjectLockEnabled,
  getRetentionModalLabel,
} from '@odf/shared/s3/utils';
import { CopyToClipboard } from '@odf/shared/utils/copy-to-clipboard';
import { TFunction } from 'i18next';
import { useParams, useSearchParams } from 'react-router';
import useSWR from 'swr';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelBody,
  DrawerPanelContent,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  LabelGroup,
  Level,
  LevelItem,
  MenuToggle,
  Switch,
  Title,
  Tab,
  Tabs,
  TabTitleText,
  PaginationVariant,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { TagIcon } from '@patternfly/react-icons';
import { IAction, TableVariant } from '@patternfly/react-table';
import { ObjectsDeleteResponse } from '../../../modals/s3-browser/delete-objects/DeleteObjectsModal';
import { ExtraProps, DeletionAlerts } from '../objects-list/ObjectsList';
import { getHeaderColumns, ObjectVersionsTableRow } from './table-components';
import './object-details-sidebar.scss';

type ObjectDetailsSidebarContentProps = {
  closeSidebar: () => void;
  object: ObjectCrFormat;
  objectActions: React.MutableRefObject<IAction[]>;
  extraProps?: ExtraProps;
  showVersioning: boolean;
  blockDataPath?: boolean;
};

type ObjectOverviewProps = {
  object: ObjectCrFormat;
  showVersioning?: boolean;
  s3Client: S3Commands;
  bucketName: string;
  objShortenedName?: string;
  isObjectLockEnabled: boolean;
};

type ObjectVersionsProps = {
  object: ObjectCrFormat;
  s3Client: S3Commands;
  bucketName: string;
  extraProps: ExtraProps;
  foldersPath: string;
  blockDataPath?: boolean;
  isObjectLockEnabled: boolean;
};

const ItemHeading: React.FC<{ text: string }> = ({ text }) => (
  <Content>
    <Content component={ContentVariants.h5}>{text}</Content>
  </Content>
);

const fetchVersions = async ({
  setInProgress,
  setObjectVersions,
  setError,
  s3Client,
  bucketName,
  objectKey,
  t,
}: {
  setInProgress: React.Dispatch<React.SetStateAction<boolean>>;
  setObjectVersions: React.Dispatch<React.SetStateAction<ObjectCrFormat[]>>;
  setError: React.Dispatch<any>;
  s3Client: S3Commands;
  bucketName: string;
  objectKey: string;
  t: TFunction;
}) => {
  try {
    setInProgress(true);

    let allObjects: ObjectCrFormat[] = [];
    let isTruncated = true;
    let stopFetchEarly = false;
    let keyMarker: string;
    let versionIdMarker: string;

    while (isTruncated && !stopFetchEarly) {
      // eslint-disable-next-line no-await-in-loop
      const objects = await s3Client.listObjectVersions({
        Bucket: bucketName,
        Prefix: objectKey,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
      });

      const objectVersions: ObjectCrFormat[] = [];
      for (const v of objects?.Versions || []) {
        if (v.Key === objectKey)
          objectVersions.push(convertObjectDataToCrFormat(v, t, false, false));
        else stopFetchEarly = true;
      }

      const objectDeleteMarkers: ObjectCrFormat[] = [];
      for (const d of objects?.DeleteMarkers || []) {
        if (d.Key === objectKey)
          objectDeleteMarkers.push(
            convertObjectDataToCrFormat(d, t, false, true)
          );
        else stopFetchEarly = true;
      }

      allObjects = [...allObjects, ...objectVersions, ...objectDeleteMarkers];

      isTruncated = objects.IsTruncated;
      keyMarker = objects.NextKeyMarker;
      versionIdMarker = objects.NextVersionIdMarker;
    }

    allObjects.sort(sortByLastModified);
    setObjectVersions(allObjects);
  } catch (error) {
    setError(error);
  } finally {
    setInProgress(false);
  }
};

const ObjectVersions: React.FC<ObjectVersionsProps> = ({
  object,
  s3Client,
  bucketName,
  foldersPath,
  extraProps,
  blockDataPath = false,
  isObjectLockEnabled,
}) => {
  const { t } = useCustomTranslation();

  const {
    setDeleteResponse: setDeleteResponseListPage,
    refreshTokens,
    closeObjectSidebar,
  } = extraProps;

  const launcher = useModalWrapper();

  const [objectVersions, setObjectVersions] = React.useState<ObjectCrFormat[]>(
    []
  );
  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState(null);
  // used for storing API's response on performing delete operation on object version
  const [deleteResponseSideBar, setDeleteResponseSideBar] =
    React.useState<ObjectsDeleteResponse>({
      selectedObjects: [] as ObjectCrFormat[],
      deleteResponse: {} as DeleteObjectsCommandOutput,
    });

  const hasOnlySingleVersion = objectVersions.length === 1;
  const objectKey = getName(object);

  // initial fetch on first mount or on object version deletion
  // or if sidebar re-renders with a different object
  React.useEffect(() => {
    fetchVersions({
      setInProgress,
      setObjectVersions,
      setError,
      s3Client,
      bucketName,
      objectKey,
      t,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteResponseSideBar, objectKey]);

  return (
    <>
      <Content className="pf-v6-u-my-sm">
        <Content component={ContentVariants.small}>
          {t(
            'Perform actions such as sharing, downloading, previewing, and deleting different versions of an object. For a comprehensive view of each version, enable "List all versions."'
          )}
        </Content>
      </Content>
      <DeletionAlerts
        deleteResponse={deleteResponseSideBar}
        foldersPath={foldersPath}
      />
      <PaginatedListPage
        filteredData={objectVersions}
        noData={hasOnlySingleVersion}
        hideFilter
        composableTableProps={{
          columns: getHeaderColumns(t),
          RowComponent: ObjectVersionsTableRow,
          extraProps: {
            launcher,
            bucketName,
            s3Client,
            foldersPath,
            blockDataPath,
            isObjectLockEnabled,
            // if object has only single version, display deletion status on the main list page instead of the sidebar
            // sidebar will close in this case as no objects/versions are left to display
            setDeleteResponse: hasOnlySingleVersion
              ? setDeleteResponseListPage
              : setDeleteResponseSideBar,
            ...(hasOnlySingleVersion && { refreshTokens }),
            ...(hasOnlySingleVersion && { closeObjectSidebar }),
          },
          unfilteredData: objectVersions as [],
          loaded: !inProgress,
          loadError: error,
          variant: TableVariant.compact,
        }}
        paginationProps={{
          variant: PaginationVariant.top,
          isCompact: true,
          dropDirection: 'down',
          perPageOptions: [{ title: '10', value: 10 }],
        }}
      />
    </>
  );
};

const ObjectOverview: React.FC<ObjectOverviewProps> = ({
  object,
  showVersioning,
  s3Client,
  bucketName,
  objShortenedName,
  isObjectLockEnabled,
}) => {
  const { t } = useCustomTranslation();

  const objectKey = getName(object);
  const versionId = getObjectVersionId(object);
  const lastModified = object?.apiResponse?.lastModified;
  const isDeleteMarker = object?.isDeleteMarker;

  const { data: objectData, isLoading: isObjectDataLoading } = useSWR(
    // don't fetch if object is a delete marker ("headObject" not supported)
    isDeleteMarker
      ? null
      : `${s3Client.providerType}-${objectKey}-${lastModified}-${OBJECT_CACHE_KEY_SUFFIX}`,
    () =>
      s3Client.headObject({
        Bucket: bucketName,
        Key: objectKey,
        ...(showVersioning && { VersionId: versionId }),
      })
  );
  const { data: tagData, isLoading: isTagDataLoading } = useSWR(
    // don't fetch if object is a delete marker ("getObjectTagging" not supported)
    isDeleteMarker
      ? null
      : `${s3Client.providerType}-${objectKey}-${lastModified}-${OBJECT_TAGGING_CACHE_KEY_SUFFIX}}`,
    () =>
      s3Client.getObjectTagging({
        Bucket: bucketName,
        Key: objectKey,
        ...(showVersioning && { VersionId: versionId }),
      })
  );
  const { data: retentionData, mutate: retentionMutate } = useSWR(
    isDeleteMarker || !isObjectLockEnabled
      ? null
      : `${s3Client.providerType}-${objectKey}-${lastModified}-${OBJECT_RETENTION_CACHE_KEY_SUFFIX}`,
    () =>
      s3Client.getObjectRetention({
        Bucket: bucketName,
        Key: objectKey,
        ...(versionId && { VersionId: versionId }),
      })
  );

  const objectRetention = retentionData?.Retention;
  const isObjectRetentionEnabled = !!objectRetention;
  const retentionMode = objectRetention?.Mode;
  const retainUntilDate = objectRetention?.RetainUntilDate;
  // Compliance retention cannot be cleared before RetainUntilDate.
  const isComplianceRetentionActive =
    retentionMode === ObjectLockRetentionMode.COMPLIANCE &&
    !!retainUntilDate &&
    new Date(retainUntilDate) > new Date();

  const [isObjectRetentionChecked, setIsObjectRetentionChecked] =
    React.useState<boolean>(false);

  const launcher = useModalWrapper();

  React.useEffect(
    () => setIsObjectRetentionChecked(isObjectRetentionEnabled),
    [isObjectRetentionEnabled, setIsObjectRetentionChecked]
  );

  const { data: legalHoldData, mutate: legalHoldMutate } = useSWR(
    isDeleteMarker || !isObjectLockEnabled
      ? null
      : `${s3Client.providerType}-${objectKey}-${lastModified}-${OBJECT_LEGAL_HOLD_CACHE_KEY_SUFFIX}`,
    () =>
      s3Client.getObjectLegalHold({
        Bucket: bucketName,
        Key: objectKey,
        ...(versionId && { VersionId: versionId }),
      })
  );
  const isLegalHoldApplied =
    legalHoldData?.LegalHold?.Status === ObjectLockLegalHoldStatus.ON;

  const tags = tagData?.TagSet?.map((tag: Tag) => (
    <Label className="pf-v6-u-mr-xs" color="grey" icon={<TagIcon />}>
      {tag.Key}
      {tag.Value && `=${tag.Value}`}
    </Label>
  ));

  const metadata = [];
  // @TODO: investigate why the Metadata is not returned (unlike in the CLI response).
  if (objectData?.Metadata) {
    for (const [key, value] of Object.entries(objectData?.Metadata)) {
      metadata.push(
        <div>
          {key}
          {value && `=${value}`}
        </div>
      );
    }
  }

  const isLoading = isObjectDataLoading || isTagDataLoading;

  // Storage class and restore status are read from the list response (the
  // single source of truth); the warning only applies while a usable restored
  // copy is missing, as a restored object can be previewed/downloaded like any
  // other.
  const needsRestore =
    isObjectDeepArchived(object) && !isObjectRestored(object);
  const restoreStatusText = getRestoreStatusText(object, t);

  return isLoading ? (
    <LoadingBox />
  ) : (
    <>
      {needsRestore && (
        <Alert
          isInline
          variant={AlertVariant.warning}
          title={t('This object is archived')}
          className="pf-v6-u-mt-sm"
        >
          {t(
            'This object is stored in the Deep Archive storage class and can only be previewed or downloaded after it is restored.'
          )}
        </Alert>
      )}
      <Grid className="odf-object-sidebar__data-grid pf-v6-u-mt-sm" hasGutter>
        <GridItem span={6}>
          <ItemHeading text={t('Name')} />
          {objShortenedName}
        </GridItem>
        <GridItem span={6}>
          <ItemHeading text={t('Key')} />
          <Level>
            <LevelItem className="odf-object-sidebar__key">
              {objectKey}
            </LevelItem>
            <LevelItem>
              <CopyToClipboard value={objectKey} iconOnly={true} />
            </LevelItem>
          </Level>
        </GridItem>
        {showVersioning && (
          <GridItem span={6}>
            <ItemHeading text={t('Version')} />
            {objectData?.VersionId || versionId || DASH}
          </GridItem>
        )}
        <GridItem span={6}>
          <ItemHeading text={t('Owner')} />
          {object.apiResponse?.ownerName}
        </GridItem>
        <GridItem span={6}>
          <ItemHeading text={t('Type')} />
          {isDeleteMarker ? t('Delete marker') : objectData?.ContentType}
        </GridItem>
        <GridItem span={6}>
          <ItemHeading text={t('Last modified')} />
          {lastModified}
        </GridItem>
        <GridItem span={6}>
          <ItemHeading text={t('Size')} />
          {object.apiResponse.size}
        </GridItem>
        <GridItem span={6}>
          <ItemHeading text={t('Storage class')} />
          {object.apiResponse?.storageClass || DASH}
          {restoreStatusText && (
            <Content component={ContentVariants.small}>
              {restoreStatusText}
            </Content>
          )}
        </GridItem>
        <GridItem span={6}>
          <ItemHeading text={t('Entity tag (ETag)')} />
          {objectData?.ETag || DASH}
        </GridItem>
        <GridItem span={12}>
          <ItemHeading text={t('Tags')} />
          {tags?.length > 0 ? <LabelGroup>{tags}</LabelGroup> : DASH}
        </GridItem>
        <GridItem span={12}>
          <ItemHeading text={t('Metadata')} />
          {metadata.length > 0 ? metadata : DASH}
        </GridItem>
        {!isDeleteMarker && (
          <GridItem span={12}>
            <Level>
              <LevelItem>
                <Content>
                  <Content component={ContentVariants.h5}>
                    {t('Retention')}
                  </Content>
                  <Content component={ContentVariants.small}>
                    {t(
                      'Prevents this object from being deleted or overwritten for a specified retention period,'
                    )}
                    <br />
                    {t('ensuring data immutability and compliance.')}
                  </Content>
                </Content>
              </LevelItem>
              <LevelItem>
                <Switch
                  id="object-retention-switch"
                  label={
                    isObjectRetentionChecked ? t('Enabled') : t('Disabled')
                  }
                  isChecked={isObjectRetentionChecked}
                  isDisabled={isComplianceRetentionActive}
                  onChange={(_event, checked) => {
                    if (checked && !isObjectLockEnabled) {
                      launcher(ObjectLockNotEnabledModal, {
                        extraProps: {
                          bucketName,
                          s3Client,
                        } as ObjectLockNotEnabledModalProps,
                        isOpen: true,
                      });
                      return;
                    }
                    launcher(SetObjectRetentionModal, {
                      extraProps: {
                        bucketName,
                        object,
                        s3Client,
                        showVersioning,
                        enableObjectRetention: checked,
                        onConfirm: () => {
                          retentionMutate();
                          setIsObjectRetentionChecked(checked);
                        },
                      } as SetObjectRetentionModalProps,
                      isOpen: true,
                    });
                  }}
                />
              </LevelItem>
            </Level>
          </GridItem>
        )}
        {objectRetention && (
          <GridItem span={12}>
            <ItemHeading text={t('Edit retention')} />
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              className="pf-v6-u-mt-sm"
            >
              <FlexItem>
                <Content component={ContentVariants.small}>
                  {t('{{mode}} mode until {{date}}.', {
                    mode: getRetentionModalLabel(retentionMode, t),
                    date: retainUntilDate?.toLocaleString(),
                  })}
                </Content>
              </FlexItem>
              <FlexItem>
                <Button
                  variant={ButtonVariant.link}
                  isInline
                  onClick={() =>
                    launcher(SetObjectRetentionModal, {
                      extraProps: {
                        bucketName,
                        object,
                        s3Client,
                        showVersioning,
                        onConfirm: () => {
                          retentionMutate();
                          setIsObjectRetentionChecked(true);
                        },
                      } as SetObjectRetentionModalProps,
                      isOpen: true,
                    })
                  }
                >
                  {t('Edit')}
                </Button>
              </FlexItem>
            </Flex>
          </GridItem>
        )}
        {!isDeleteMarker && isObjectLockEnabled && (
          <GridItem span={12}>
            <Level>
              <LevelItem>
                <ItemHeading text={t('Legal hold')} />
              </LevelItem>
              <LevelItem>
                <Button
                  variant={ButtonVariant.link}
                  isInline
                  onClick={() =>
                    launcher(LegalHoldModal, {
                      extraProps: {
                        bucketName,
                        object,
                        s3Client,
                        showVersioning,
                        onConfirm: () => legalHoldMutate(),
                      } as LegalHoldModalProps,
                      isOpen: true,
                    })
                  }
                >
                  {isLegalHoldApplied ? t('Remove') : t('Apply')}
                </Button>
              </LevelItem>
            </Level>
            <Content
              component={ContentVariants.small}
              className="pf-v6-u-mt-sm"
            >
              {isLegalHoldApplied ? t('Applied') : t('Not applied')}
            </Content>
          </GridItem>
        )}
      </Grid>
    </>
  );
};

const ObjectDetailsSidebarContent: React.FC<
  ObjectDetailsSidebarContentProps
> = ({
  closeSidebar,
  object,
  objectActions,
  extraProps,
  showVersioning,
  blockDataPath = false,
}) => {
  const { t } = useCustomTranslation();

  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);
  const dropdownToggleRef = React.useRef();

  const onDropdownToggleClick = () => {
    setIsOpen(!isOpen);
  };
  const onDropdownSelect = () => {
    setIsOpen(false);
  };

  const actionItems: IAction[] = objectActions.current;

  const { s3Client } = React.useContext(S3Context);
  const [searchParams] = useSearchParams();
  const { bucketName } = useParams();

  const { data: objectLockData } = useSWR(
    `${s3Client.providerType}-${bucketName}-${BUCKET_OBJECT_LOCK_CACHE_KEY_SUFFIX}`,
    () => s3Client.getObjectLockConfiguration({ Bucket: bucketName })
  );
  const isObjectLockEnabled = getIsObjectLockEnabled(objectLockData);

  const foldersPath = searchParams.get(PREFIX);
  const objName = object ? replacePathFromName(object, foldersPath) : '';
  const isDeleteMarker = object?.isDeleteMarker;

  const dropdownItems = [];
  if (Array.isArray(actionItems)) {
    actionItems.forEach((action: IAction) =>
      dropdownItems.push(
        <DropdownItem
          onClick={(event) =>
            action.onClick?.(event, undefined, undefined, undefined)
          }
          isDisabled={action?.isDisabled}
          key={action.itemKey}
        >
          {action.title}
        </DropdownItem>
      )
    );
  }

  return (
    <>
      <DrawerHead>
        <Title headingLevel="h3">{objName}</Title>
        <DrawerActions>
          <DrawerCloseButton onClick={closeSidebar} />
        </DrawerActions>
        <Dropdown
          isOpen={isOpen}
          onSelect={onDropdownSelect}
          toggle={{
            toggleNode: (
              <MenuToggle
                className="odf-object-sidebar__dropdown"
                ref={dropdownToggleRef}
                onClick={onDropdownToggleClick}
              >
                {t('Actions')}
              </MenuToggle>
            ),
            toggleRef: dropdownToggleRef,
          }}
        >
          <DropdownList>{dropdownItems}</DropdownList>
        </Dropdown>
      </DrawerHead>
      {isDeleteMarker && (
        <Alert
          isInline
          variant={AlertVariant.info}
          title={t('Why this object has a delete marker?')}
          className="pf-v6-u-m-sm"
        >
          <p>
            {t(
              "When an object is deleted, a delete marker is created as the current version of that object. A delete marker prevents the object from being visible when listing the objects in a bucket but does not delete the object's data. If you permanently delete the delete marker, the object can be fully restored."
            )}
          </p>
        </Alert>
      )}
      <DrawerPanelBody>
        {showVersioning && (
          <ObjectOverview
            object={object}
            showVersioning={true}
            s3Client={s3Client}
            bucketName={bucketName}
            objShortenedName={objName}
            isObjectLockEnabled={isObjectLockEnabled}
          />
        )}
        {!showVersioning && (
          <Tabs
            activeKey={activeTab}
            onSelect={(_event, tabIndex) => setActiveTab(tabIndex as number)}
            unmountOnExit
          >
            <Tab
              eventKey={0}
              title={<TabTitleText>{t('Overview')}</TabTitleText>}
            >
              <ObjectOverview
                object={object}
                showVersioning={false}
                s3Client={s3Client}
                bucketName={bucketName}
                objShortenedName={objName}
                isObjectLockEnabled={isObjectLockEnabled}
              />
            </Tab>
            <Tab
              eventKey={1}
              title={<TabTitleText>{t('Versions')}</TabTitleText>}
            >
              <ObjectVersions
                object={object}
                s3Client={s3Client}
                bucketName={bucketName}
                foldersPath={foldersPath}
                extraProps={extraProps}
                blockDataPath={blockDataPath}
                isObjectLockEnabled={isObjectLockEnabled}
              />
            </Tab>
          </Tabs>
        )}
      </DrawerPanelBody>
    </>
  );
};

type ObjectDetailsSidebarProps = {
  closeSidebar?: () => void;
  isExpanded: boolean;
  object?: ObjectCrFormat;
  objectActions?: React.MutableRefObject<IAction[]>;
  extraProps?: ExtraProps;
  wrappedContent: React.ReactNode;
  showVersioning: boolean;
  blockDataPath?: boolean;
};

export const ObjectDetailsSidebar: React.FC<ObjectDetailsSidebarProps> = ({
  closeSidebar,
  isExpanded,
  object,
  objectActions,
  extraProps,
  wrappedContent,
  showVersioning,
  blockDataPath = false,
}) => {
  return (
    <Drawer isExpanded={isExpanded} position="right">
      <DrawerContent
        panelContent={
          <DrawerPanelContent defaultSize="700px" isResizable>
            {object && (
              <ObjectDetailsSidebarContent
                closeSidebar={closeSidebar}
                object={object}
                objectActions={objectActions}
                extraProps={extraProps}
                showVersioning={showVersioning}
                blockDataPath={blockDataPath}
              />
            )}
          </DrawerPanelContent>
        }
      >
        <DrawerContentBody>{wrappedContent}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
