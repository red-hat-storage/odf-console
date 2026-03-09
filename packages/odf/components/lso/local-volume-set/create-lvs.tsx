import * as React from 'react';
import { nodeResource } from '@odf/core/resources';
import { hasNoTaints, getLocalVolumeSetRequestData } from '@odf/core/utils';
import { ClusterServiceVersionModel, LocalVolumeSetModel } from '@odf/shared';
import { resourcePathFromModel, referenceForModel } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  NodeKind,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import { useParams, useNavigate } from 'react-router-dom-v5-compat';
import { Form } from '@patternfly/react-core';
import { FormFooter } from '../common/form-footer';
import { getNodesByHostNameLabel } from '../local-volume-discovery/util';
import { LocalVolumeSetBody } from './body';
import { LocalVolumeSetHeader } from './header';
import { initialState, reducer } from './state';

const CreateLocalVolumeSet: React.FC = () => {
  const { appName, ns } = useParams();
  const resourcePath = resourcePathFromModel(
    ClusterServiceVersionModel,
    appName,
    ns
  );

  const [state, dispatch] = React.useReducer(reducer, initialState);
  const [nodesData, nodesLoaded, nodesLoadError] =
    useK8sWatchResource<NodeKind[]>(nodeResource);
  const navigate = useNavigate();
  const [inProgress, setInProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  React.useEffect(() => {
    if (nodesLoaded && !nodesLoadError && nodesData?.length !== 0) {
      const filteredNodes: NodeKind[] = nodesData.filter(hasNoTaints);
      dispatch({ type: 'setLvsAllNodes', value: filteredNodes });
    }
  }, [nodesData, nodesLoadError, nodesLoaded]);

  const onSubmit = async (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();
    setInProgress(true);

    const lvsNodes = state.lvsIsSelectNodes
      ? state.lvsSelectNodes
      : state.lvsAllNodes;
    const nodesByHostNameLabel = getNodesByHostNameLabel(lvsNodes);
    const requestData = getLocalVolumeSetRequestData(
      state,
      nodesByHostNameLabel,
      ns
    );

    k8sCreate({ model: LocalVolumeSetModel, data: requestData })
      .then(() => {
        navigate(
          `/k8s/ns/${ns}/clusterserviceversions/${appName}/${referenceForModel(
            LocalVolumeSetModel
          )}/${state.volumeSetName}`
        );
      })
      .catch((e) =>
        e?.message
          ? setErrorMessage(e.message)
          : setErrorMessage(JSON.stringify(e))
      );
  };

  const getDisabledCondition = () => {
    const nodes = state.lvsIsSelectNodes
      ? state.lvsSelectNodes
      : state.lvsAllNodes;
    if (!state.volumeSetName.trim().length) return true;
    if (nodes.length < 1) return true;
    if (!state.isValidDiskSize) return true;
    return false;
  };

  return (
    <>
      <div className="odf-create-operand__header">
        <LocalVolumeSetHeader className="odf-create-operand__header-text" />
      </div>
      <Form
        noValidate={false}
        className="odf-m-pane__body pf-v6-u-w-75"
        onSubmit={onSubmit}
      >
        <LocalVolumeSetBody
          dispatch={dispatch}
          state={state}
          storageClassName={''}
        />
        <FormFooter
          errorMessage={errorMessage}
          inProgress={inProgress}
          cancelUrl={resourcePath}
          disableNext={getDisabledCondition()}
        />
      </Form>
    </>
  );
};

export default CreateLocalVolumeSet;
