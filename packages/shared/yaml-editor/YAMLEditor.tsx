import * as React from 'react';
import {
  K8sModel,
  ResourceYAMLEditor,
} from '@openshift-console/dynamic-plugin-sdk';
import { DetailsPageTitle } from '../details-page/DetailsPage';
import { LoadingBox } from '../generic/status-box';
import PageHeading from '../heading/page-heading';
import { useK8sGet } from '../hooks/k8s-get-hook';

type YAMLEditorProps = {
  name: string;
  namespace: string;
  model: K8sModel;
};

const YAMLEditor: React.FC<YAMLEditorProps> = ({ name, namespace, model }) => {
  const [data, loaded, loadError] = useK8sGet(model, name, namespace);

  return data && loaded && !loadError ? (
    <React.Suspense fallback={LoadingBox}>
      <PageHeading
        title={<DetailsPageTitle resource={data} resourceModel={model} />}
      />
      <ResourceYAMLEditor initialResource={data} />
    </React.Suspense>
  ) : (
    <LoadingBox />
  );
};

export default YAMLEditor;
