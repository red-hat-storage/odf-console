import * as React from 'react';
import { ObjectDetailsSidebar } from '@odf/core/components/s3-browser/object-details/ObjectDetailsSidebar';
import { ObjectCrFormat } from '@odf/core/types';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { useParams } from 'react-router-dom-v5-compat';
import { IAction } from '@patternfly/react-table';
import { NoobaaS3Context } from '../noobaa-context';
import UploadSidebar from '../upload-objects';
import { FileUploadComponent } from '../upload-objects';
import { ObjectsList } from './ObjectsList';

type ObjectListWithSidebarProps = {
  obj: { fresh: boolean; triggerRefresh: () => void };
};

export const ObjectListWithSidebar: React.FC<ObjectListWithSidebarProps> = ({
  obj: { fresh, triggerRefresh },
}) => {
  const [isUploadSidebarExpanded, setUploadSidebarExpanded] =
    React.useState(false);
  const [isObjectSidebarExpanded, setObjectSidebarExpanded] =
    React.useState(false);
  const [object, setObject] = React.useState<ObjectCrFormat>(null);
  const [objectActions, setObjectActions] =
    React.useState<React.MutableRefObject<IAction[]>>();
  const [completionTime, setCompletionTime] = React.useState<number>();

  const { bucketName } = useParams();

  const { noobaaS3 } = React.useContext(NoobaaS3Context);

  const closeObjectSidebar = () => setObjectSidebarExpanded(false);
  const closeUploadSidebar = () => setUploadSidebarExpanded(false);
  const showUploadSidebar = () => {
    closeObjectSidebar();
    setUploadSidebarExpanded(true);
  };
  const onRowClick = (
    selectedObject: ObjectCrFormat,
    actionItems: React.MutableRefObject<IAction[]>
  ) => {
    if (selectedObject.isFolder) return;
    closeUploadSidebar();
    setObject(selectedObject);
    setObjectActions(actionItems);
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
              wrappedContent={
                <ObjectsList
                  onRowClick={onRowClick}
                  closeObjectSidebar={closeObjectSidebar}
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
