import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { LoadingBox } from '@odf/shared/generic/status-box';
import YAMLEditor from '@odf/shared/yaml-editor/YAMLEditor';
import { useK8sModel } from '@openshift-console/dynamic-plugin-sdk';
import { useRouteMatch } from 'react-router';

type RouteParams = {
  kind: string;
  name: string;
};

const GenericResourceEditor: React.FC = () => {
  const match = useRouteMatch<RouteParams>();

  const [model, inFlight] = useK8sModel(match.params.kind);

  return inFlight ? (
    <LoadingBox />
  ) : (
    <>
      <YAMLEditor
        name={match.params.name}
        model={model}
        namespace={CEPH_STORAGE_NAMESPACE}
      />
    </>
  );
};

export default GenericResourceEditor;
