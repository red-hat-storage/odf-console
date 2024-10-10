import * as React from 'react';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { useParams } from 'react-router-dom-v5-compat';
import { NoobaaS3Context } from '../noobaa-context';
import UploadSidebar from '../upload-objects';
import { UploadProgress } from '../upload-objects';
import { FileUploadComponent } from '../upload-objects';
import { ObjectsList } from './ObjectsList';

type ObjectListWithSidebarProps = {
  obj: { refresh: boolean; triggerRefresh: () => void };
};

export const ObjectListWithSidebar: React.FC<ObjectListWithSidebarProps> = ({
  obj: { refresh, triggerRefresh },
}) => {
  const [isExpanded, setExpanded] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<UploadProgress>(
    {}
  );
  const [completionTime, setCompletionTime] = React.useState<number>();

  const abortAll = React.useCallback(() => {
    Object.values(uploadProgress).forEach((upload) => upload?.abort?.());
  }, [uploadProgress]);

  const { bucketName } = useParams();

  const { noobaaS3 } = React.useContext(NoobaaS3Context);

  const closeSidebar = () => setExpanded(false);
  const showSidebar = () => setExpanded(true);

  return (
    <UploadSidebar
      isExpanded={isExpanded}
      closeSidebar={closeSidebar}
      uploadProgress={uploadProgress}
      completionTime={completionTime}
      mainContent={
        <>
          <FileUploadComponent
            client={noobaaS3}
            bucketName={bucketName}
            uploadProgress={uploadProgress}
            setUploadProgress={setUploadProgress}
            showSidebar={showSidebar}
            abortAll={abortAll}
            setCompletionTime={setCompletionTime}
            triggerRefresh={triggerRefresh}
          />
          {refresh ? <ObjectsList /> : <LoadingBox />}
        </>
      }
    />
  );
};
