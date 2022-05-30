import * as React from 'react';
import { LoadingBox } from '@odf/shared/generic/status-box';
import YAMLEditor from '@odf/shared/yaml-editor/YAMLEditor';
import {
  K8sModel,
  useK8sModel,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { useRouteMatch } from 'react-router';

// import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';

type RouteParams = {
  kind: string;
  name: string;
  namespace?: string;
  cluster?: string;
};

const GenericResourceEditor: React.FC = () => {
  const match = useRouteMatch<RouteParams>();
  const { kind, name, namespace, cluster } = match.params;
  const [model, inFlight] = useK8sModel(kind);
  const [sourceObj, setSourceObj] = React.useState<K8sResourceCommon>({});

  const [resource, loaded, loadError] = useK8sWatchResource<K8sModel>({
    kind,
    name,
    namespace,
    namespaced: model?.namespaced,
    ...(!!cluster ? { cluster } : {}),
  });

  React.useEffect(() => {
    if (resource && loaded && !loadError) {
      setSourceObj(resource);
    }
  }, [resource, loaded, loadError]);

  return inFlight || !loaded || loadError ? (
    <LoadingBox />
  ) : (
    <>
      <YAMLEditor
        model={model}
        sourceObj={sourceObj}
        setSourceObj={setSourceObj}
        cluster={cluster}
      />
    </>
  );
};

export default GenericResourceEditor;
