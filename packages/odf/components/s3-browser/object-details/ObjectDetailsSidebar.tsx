import * as React from 'react';
import { Tag } from '@aws-sdk/client-s3';
import { NoobaaS3Context } from '@odf/core/components/s3-browser/noobaa-context';
import {
  OBJECT_CACHE_KEY_SUFFIX,
  OBJECT_TAGGING_CACHE_KEY_SUFFIX,
  PREFIX,
} from '@odf/core/constants';
import { ObjectCrFormat } from '@odf/core/types';
import { replacePathFromName } from '@odf/core/utils';
import {
  DASH,
  DrawerHead,
  LoadingBox,
  useCustomTranslation,
} from '@odf/shared';
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
} from '@patternfly/react-core';
import { TagIcon } from '@patternfly/react-icons';
import { IAction } from '@patternfly/react-table';
import './object-details-sidebar.scss';

type ObjectDetailsSidebarContentProps = {
  closeSidebar: () => void;
  object: ObjectCrFormat;
  objectActions: React.MutableRefObject<IAction[]>;
};

const ObjectDetailsSidebarContent: React.FC<ObjectDetailsSidebarContentProps> =
  ({ closeSidebar, object, objectActions }) => {
    const { t } = useCustomTranslation();
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownToggleRef = React.useRef();
    const onToggleClick = () => {
      setIsOpen(!isOpen);
    };
    const onSelect = () => {
      setIsOpen(false);
    };

    const actionItems: IAction[] = objectActions.current;

    const { noobaaS3 } = React.useContext(NoobaaS3Context);
    const [searchParams] = useSearchParams();
    const { bucketName } = useParams();

    const objectKey = object?.metadata?.name;
    const foldersPath = searchParams.get(PREFIX);
    const objName = object ? replacePathFromName(object, foldersPath) : '';
    const { data: objectData, isLoading: isObjectDataLoading } = useSWR(
      `${objectKey}-${OBJECT_CACHE_KEY_SUFFIX}`,
      () =>
        noobaaS3.getObject({
          Bucket: bucketName,
          Key: objectKey,
        })
    );
    const { data: tagData, isLoading: isTagDataLoading } = useSWR(
      `${objectKey}-${OBJECT_TAGGING_CACHE_KEY_SUFFIX}`,
      () =>
        noobaaS3.getObjectTagging({
          Bucket: bucketName,
          Key: objectKey,
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

    const dropdownItems = [];
    if (Array.isArray(actionItems)) {
      actionItems.forEach((action: IAction) =>
        dropdownItems.push(
          <DropdownItem
            onClick={action.onClick}
            isDisabled={action?.isDisabled}
          >
            {action.title}
          </DropdownItem>
        )
      );
    }

    const isLoading = isObjectDataLoading || isTagDataLoading;

    return isLoading ? (
      <LoadingBox />
    ) : (
      <>
        <DrawerHead>
          <Title headingLevel="h3">{objName}</Title>
          <DrawerActions>
            <DrawerCloseButton onClick={closeSidebar} />
          </DrawerActions>
          <Dropdown
            isOpen={isOpen}
            onSelect={onSelect}
            toggle={{
              toggleNode: (
                <MenuToggle
                  className="odf-object-sidebar__dropdown"
                  ref={dropdownToggleRef}
                  onClick={onToggleClick}
                >
                  {t('Actions')}
                </MenuToggle>
              ),
              toggleRef: dropdownToggleRef,
            }}
          >
            <DropdownList>{dropdownItems}</DropdownList>
          </Dropdown>
          {objectData?.VersionId && (
            <Alert
              className="pf-v5-u-mt-md"
              isInline
              variant={AlertVariant.info}
              title={t(
                'This object has multiple versions. You are currently viewing the latest version. To access or manage previous versions, use S3 interface or CLI.'
              )}
            ></Alert>
          )}
        </DrawerHead>
        <DrawerPanelBody>
          <Grid className="odf-object-sidebar__data-grid" hasGutter>
            <GridItem span={6}>
              <h5>{t('Name')}</h5>
              {objName}
            </GridItem>
            <GridItem span={6}>
              <h5>{t('Key')}</h5>
              <Level>
                <LevelItem className="odf-object-sidebar__key">
                  {objectKey}
                </LevelItem>
                <LevelItem>
                  <CopyToClipboard value={objectKey} iconOnly={true} />
                </LevelItem>
              </Level>
            </GridItem>
            <GridItem span={6}>
              <h5>{t('Version')}</h5>
              {objectData?.VersionId || DASH}
            </GridItem>
            <GridItem span={6}>
              <h5>{t('Owner')}</h5>
              {object.apiResponse?.ownerName}
            </GridItem>
            <GridItem span={6}>
              <h5>{t('Type')}</h5>
              {objectData?.ContentType}
            </GridItem>
            <GridItem span={6}>
              <h5>{t('Last modified')}</h5>
              {object.apiResponse.lastModified}
            </GridItem>
            <GridItem span={6}>
              <h5>{t('Size')}</h5>
              {object.apiResponse.size}
            </GridItem>
            <GridItem span={6}>
              <h5>{t('Entity tag (ETag)')}</h5>
              {objectData?.ETag}
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
};

export const ObjectDetailsSidebar: React.FC<ObjectDetailsSidebarProps> = ({
  closeSidebar,
  isExpanded,
  object,
  objectActions,
  wrappedContent,
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
