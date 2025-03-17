import * as React from 'react';
import { ObjectDetailsSidebar } from '@odf/core/components/s3-browser/object-details/ObjectDetailsSidebar';
import { BUCKET_VERSIONING_CACHE_KEY_SUFFIX } from '@odf/core/constants';
import { ObjectCrFormat } from '@odf/core/types';
import { LoadingBox } from '@odf/shared/generic/status-box';
import {
  getIsVersioningEnabled,
  getIsVersioningSuspended,
} from '@odf/shared/s3/utils';
import { useParams } from 'react-router-dom-v5-compat';
import useSWR from 'swr';
import { IAction } from '@patternfly/react-table';
import { NoobaaS3Context } from '../noobaa-context';
import UploadSidebar from '../upload-objects';
import { FileUploadComponent } from '../upload-objects';
import { ExtraProps, ObjectsList } from './ObjectsList';

type ObjectListWithSidebarProps = {
  obj: { fresh: boolean; triggerRefresh: () => void };
};

export const ObjectListWithSidebar: React.FC<ObjectListWithSidebarProps> = ({
  obj: { fresh, triggerRefresh },
}) => {
  const { bucketName } = useParams();
  const { noobaaS3 } = React.useContext(NoobaaS3Context);

  const { data: versioningData } = useSWR(
    `${bucketName}-${BUCKET_VERSIONING_CACHE_KEY_SUFFIX}`,
    () => noobaaS3.getBucketVersioning({ Bucket: bucketName })
  );

  const allowVersioning =
    getIsVersioningEnabled(versioningData) ||
    getIsVersioningSuspended(versioningData);

  const [isUploadSidebarExpanded, setUploadSidebarExpanded] =
    React.useState(false);
  const [isObjectSidebarExpanded, setObjectSidebarExpanded] =
    React.useState(false);
  const [object, setObject] = React.useState<ObjectCrFormat>(null);
  const [objectActions, setObjectActions] =
    React.useState<React.MutableRefObject<IAction[]>>();
  const [extraProps, setExtraProps] = React.useState({} as ExtraProps);
  const [completionTime, setCompletionTime] = React.useState<number>();
  const [listAllVersions, setListAllVersions] = React.useState<boolean>(false);

  const closeObjectSidebar = () => setObjectSidebarExpanded(false);
  const closeUploadSidebar = () => setUploadSidebarExpanded(false);
  const showUploadSidebar = () => {
    closeObjectSidebar();
    setUploadSidebarExpanded(true);
  };
  const onRowClick = (
    selectedObject: ObjectCrFormat,
    actionItems: React.MutableRefObject<IAction[]>,
    objectExtraProps: ExtraProps
  ) => {
    if (selectedObject.isFolder) return;
    closeUploadSidebar();
    setObject(selectedObject);
    setObjectActions(actionItems);
    setExtraProps(objectExtraProps);
    setObjectSidebarExpanded(true);
  };

  return (
    <UploadSidebar
      isExpanded={isUploadSidebarExpanded}
      closeSidebar={closeUploadSidebar}
      completionTime={completionTime}
      mainContent={
        <>
          <FileUploadComponent
            client={noobaaS3}
            bucketName={bucketName}
            showSidebar={showUploadSidebar}
            hideSidebar={closeUploadSidebar}
            setCompletionTime={setCompletionTime}
            triggerRefresh={triggerRefresh}
          />
          {fresh ? (
            <ObjectDetailsSidebar
              closeSidebar={closeObjectSidebar}
              isExpanded={isObjectSidebarExpanded}
              object={object}
              objectActions={objectActions}
              extraProps={extraProps}
              showVersioning={listAllVersions}
              wrappedContent={
                <ObjectsList
                  onRowClick={onRowClick}
                  closeObjectSidebar={closeObjectSidebar}
                  listAllVersions={listAllVersions}
                  setListAllVersions={setListAllVersions}
                  allowVersioning={allowVersioning}
                />
              }
            />
          ) : (
            <LoadingBox />
          )}
        </>
      }
    />
  );
};
