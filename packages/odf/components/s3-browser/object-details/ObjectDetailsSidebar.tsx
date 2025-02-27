import * as React from 'react';
import { Tag } from '@aws-sdk/client-s3';
import { NoobaaS3Context } from '@odf/core/components/s3-browser/noobaa-context';
import {
  OBJECT_CACHE_KEY_SUFFIX,
  OBJECT_TAGGING_CACHE_KEY_SUFFIX,
  PREFIX,
} from '@odf/core/constants';
import { ObjectCrFormat } from '@odf/core/types';
import { replacePathFromName, getObjectVersionId } from '@odf/core/utils';
import {
  DASH,
  DrawerHead,
  LoadingBox,
  useCustomTranslation,
} from '@odf/shared';
import { S3Commands } from '@odf/shared/s3';
import { CopyToClipboard } from '@odf/shared/utils/copy-to-clipboard';
import { useParams, useSearchParams } from 'react-router-dom-v5-compat';
import useSWR from 'swr';
import {
  Alert,
  AlertVariant,
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
  Grid,
  GridItem,
  Label,
  LabelGroup,
  Level,
  LevelItem,
  MenuToggle,
  Title,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { TagIcon } from '@patternfly/react-icons';
import { IAction } from '@patternfly/react-table';
import './object-details-sidebar.scss';

type ObjectDetailsSidebarContentProps = {
  closeSidebar: () => void;
  object: ObjectCrFormat;
  objectActions: React.MutableRefObject<IAction[]>;
  showVersioning: boolean;
};

type ObjectDetailsProps = {
  object: ObjectCrFormat;
  showVersioning: boolean;
  noobaaS3: S3Commands;
  bucketName: string;
  objShortenedName?: string;
};

const ObjectOverview: React.FC<ObjectDetailsProps> = ({
  object,
  showVersioning,
  noobaaS3,
  bucketName,
  objShortenedName,
}) => {
  const { t } = useCustomTranslation();

  const objectKey = object?.metadata?.name;
  const versionId = getObjectVersionId(object);
  const lastModified = object?.apiResponse?.lastModified;
  const isDeleteMarker = object?.isDeleteMarker;

  const { data: objectData, isLoading: isObjectDataLoading } = useSWR(
    // don't fetch if object is a delete marker ("getObject" not supported)
    isDeleteMarker
      ? null
      : `${objectKey}-${lastModified}-${OBJECT_CACHE_KEY_SUFFIX}`,
    () =>
      noobaaS3.getObject({
        Bucket: bucketName,
        Key: objectKey,
        ...(showVersioning && { VersionId: versionId }),
      })
  );
  const { data: tagData, isLoading: isTagDataLoading } = useSWR(
    // don't fetch if object is a delete marker ("getObjectTagging" not supported)
    isDeleteMarker
      ? null
      : `${objectKey}-${lastModified}-${OBJECT_TAGGING_CACHE_KEY_SUFFIX}}`,
    () =>
      noobaaS3.getObjectTagging({
        Bucket: bucketName,
        Key: objectKey,
        ...(showVersioning && { VersionId: versionId }),
      })
  );

  const tags = tagData?.TagSet?.map((tag: Tag) => (
    <Label className="pf-v5-u-mr-xs" color="grey" icon={<TagIcon />}>
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

  return isLoading ? (
    <LoadingBox />
  ) : (
    <Grid className="odf-object-sidebar__data-grid pf-v5-u-mt-sm" hasGutter>
      <GridItem span={6}>
        <h5>{t('Name')}</h5>
        {objShortenedName}
      </GridItem>
      <GridItem span={6}>
        <h5>{t('Key')}</h5>
        <Level>
          <LevelItem className="odf-object-sidebar__key">{objectKey}</LevelItem>
          <LevelItem>
            <CopyToClipboard value={objectKey} iconOnly={true} />
          </LevelItem>
        </Level>
      </GridItem>
      {showVersioning && (
        <GridItem span={6}>
          <h5>{t('Version')}</h5>
          {objectData?.VersionId || versionId || DASH}
        </GridItem>
      )}
      <GridItem span={6}>
        <h5>{t('Owner')}</h5>
        {object.apiResponse?.ownerName}
      </GridItem>
      <GridItem span={6}>
        <h5>{t('Type')}</h5>
        {isDeleteMarker ? t('Delete marker') : objectData?.ContentType}
      </GridItem>
      <GridItem span={6}>
        <h5>{t('Last modified')}</h5>
        {lastModified}
      </GridItem>
      <GridItem span={6}>
        <h5>{t('Size')}</h5>
        {object.apiResponse.size}
      </GridItem>
      <GridItem span={6}>
        <h5>{t('Entity tag (ETag)')}</h5>
        {objectData?.ETag || DASH}
      </GridItem>
      <GridItem span={12}>
        <h5>{t('Tags')}</h5>
        {tags?.length > 0 ? <LabelGroup>{tags}</LabelGroup> : DASH}
      </GridItem>
      <GridItem span={12}>
        <h5>{t('Metadata')}</h5>
        {metadata.length > 0 ? metadata : DASH}
      </GridItem>
    </Grid>
  );
};

const ObjectDetailsSidebarContent: React.FC<
  ObjectDetailsSidebarContentProps
> = ({ closeSidebar, object, objectActions, showVersioning }) => {
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

  const { noobaaS3 } = React.useContext(NoobaaS3Context);
  const [searchParams] = useSearchParams();
  const { bucketName } = useParams();

  const foldersPath = searchParams.get(PREFIX);
  const objName = object ? replacePathFromName(object, foldersPath) : '';
  const isDeleteMarker = object?.isDeleteMarker;

  const dropdownItems = [];
  if (Array.isArray(actionItems)) {
    actionItems.forEach((action: IAction) =>
      dropdownItems.push(
        <DropdownItem onClick={action.onClick} isDisabled={action?.isDisabled}>
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
          className="pf-v5-u-m-sm"
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
            showVersioning={showVersioning}
            noobaaS3={noobaaS3}
            bucketName={bucketName}
            objShortenedName={objName}
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
                showVersioning={showVersioning}
                noobaaS3={noobaaS3}
                bucketName={bucketName}
                objShortenedName={objName}
              />
            </Tab>
            <Tab
              eventKey={1}
              title={<TabTitleText>{t('Versions')}</TabTitleText>}
            >
              TEST
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
  wrappedContent: React.ReactNode;
  showVersioning: boolean;
};

export const ObjectDetailsSidebar: React.FC<ObjectDetailsSidebarProps> = ({
  closeSidebar,
  isExpanded,
  object,
  objectActions,
  wrappedContent,
  showVersioning,
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
                showVersioning={showVersioning}
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
