import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { S3Commands } from '@odf/shared/s3';
import { getName } from '@odf/shared/selectors';
import { ObjectCrFormat } from '../../../types';

type DownloadAndPreviewFunction = (
  bucketName: string,
  object: ObjectCrFormat,
  noobaaS3: S3Commands,
  setDownloadAndPreview: React.Dispatch<
    React.SetStateAction<DownloadAndPreviewState>
  >
) => void;

type GetObjectURL = (
  bucketName: string,
  object: ObjectCrFormat,
  noobaaS3: S3Commands
) => Promise<string>;

export type DownloadAndPreviewState = {
  isDownloading: boolean;
  isPreviewing: boolean;
};

const getObjectURL: GetObjectURL = async (bucketName, object, noobaaS3) => {
  const responseStream: GetObjectCommandOutput = await noobaaS3.getObject({
    Bucket: bucketName,
    Key: getName(object),
  });
  let blob = await new Response(responseStream.Body as ReadableStream).blob();
  blob = blob.slice(
    0,
    blob.size,
    responseStream.ContentType || 'application/octet-stream'
  );

  return window.URL.createObjectURL(blob);
};

export const onDownload: DownloadAndPreviewFunction = async (
  bucketName,
  object,
  noobaaS3,
  setDownloadAndPreview
) => {
  try {
    setDownloadAndPreview((downloadAndPreview) => ({
      ...downloadAndPreview,
      isDownloading: true,
    }));

    const objectURL = await getObjectURL(bucketName, object, noobaaS3);

    // create a download element and trigger download
    const downloadLink = document.createElement('a');
    downloadLink.href = objectURL;
    downloadLink.download = getName(object);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    window.URL.revokeObjectURL(objectURL);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching S3 object:', err);
  } finally {
    setDownloadAndPreview((downloadAndPreview) => ({
      ...downloadAndPreview,
      isDownloading: false,
    }));
  }
};

export const onPreview: DownloadAndPreviewFunction = async (
  bucketName,
  object,
  noobaaS3,
  setDownloadAndPreview
) => {
  try {
    setDownloadAndPreview((downloadAndPreview) => ({
      ...downloadAndPreview,
      isPreviewing: true,
    }));

    const objectURL = await getObjectURL(bucketName, object, noobaaS3);

    // open the object URL in a new browser tab
    window.open(objectURL, '_blank');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching S3 object:', err);
  } finally {
    setDownloadAndPreview((downloadAndPreview) => ({
      ...downloadAndPreview,
      isPreviewing: false,
    }));
  }
};
