import * as React from 'react';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { useParams } from 'react-router-dom-v5-compat';
import { NoobaaS3Context } from '../noobaa-context';
import { FileUploadComponent } from '../upload-objects/FileUploadComponent';
import { UploadProgress } from '../upload-objects/types';
import { UploadSidebar } from '../upload-objects/UploadSidebar';
import { getCompletedAndTotalUploadObjects } from '../upload-objects/utils';
import { ObjectsList } from './ObjectsList';

type ObjectListWithSidebarProps = {
  obj: { refresh: boolean };
};

export const ObjectListWithSidebar: React.FC<ObjectListWithSidebarProps> = ({
  obj: { refresh },
}) => {
  const [isExpanded, setExpanded] = React.useState(false);
  const [objects, setObjects] = React.useState<UploadProgress>({});

  const abortAll = React.useCallback(async () => {
    const aborters = Object.keys(objects).map((obj) => objects?.[obj]?.abort);
    await Promise.all(aborters);
  }, [objects]);

  const { bucketName } = useParams();

  const { noobaaS3 } = React.useContext(NoobaaS3Context);

  const [totalCompletedUploads, totalObjects] =
    getCompletedAndTotalUploadObjects(objects);

  return (
    <UploadSidebar
      isExpanded={isExpanded}
      closeSidebar={() => setExpanded(false)}
      progress={objects}
      mainContent={
        <>
          <FileUploadComponent
            client={noobaaS3}
            bucketName={bucketName}
            uploadProgress={objects}
            setUploadProgress={setObjects}
            showSidebar={() => setExpanded(true)}
            abortAll={abortAll}
            totalObjects={totalObjects}
            totalCompletedObjects={totalCompletedUploads}
          />
          {refresh ? <ObjectsList /> : <LoadingBox />}
        </>
      }
    />
  );
};
