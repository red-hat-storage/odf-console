import * as React from 'react';
import { DISCOVERY_CR_NAME } from '@odf/core/constants';
import { nodeResource } from '@odf/core/resources';
import {
  createLocalVolumeDiscovery,
  hasNoTaints,
  updateLocalVolumeDiscovery,
} from '@odf/core/utils';
import {
  ClusterServiceVersionModel,
  LocalVolumeDiscovery,
  useCustomTranslation,
} from '@odf/shared';
import { referenceForModel, resourcePathFromModel } from '@odf/shared/utils';
import {
  NodeKind,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  NavigateFunction,
  useNavigate,
  useParams,
} from 'react-router-dom-v5-compat';
import { Form, FormGroup } from '@patternfly/react-core';
import { FormFooter } from '../common/form-footer';
import { LocalVolumeDiscoveryBody } from './body';
import { LocalVolumeDiscoveryHeader } from './header';
import { getNodesByHostNameLabel } from './util';
import '../common/common.scss';

const makeLocalVolumeDiscoverRequest = async (
  nodes: string[],
  ns: string,
  setError: React.Dispatch<React.SetStateAction<string>>,
  setProgress: React.Dispatch<React.SetStateAction<boolean>>,
  url: string,
  navigate: NavigateFunction
) => {
  setProgress(true);
  try {
    await updateLocalVolumeDiscovery(nodes, ns, setError);
    navigate(url);
  } catch (error) {
    if (error?.response?.status === 404) {
      try {
        await createLocalVolumeDiscovery(nodes, ns, setError);
        navigate(url);
      } catch (createError) {
        setError(createError.message);
      }
    } else {
      setError(error.message);
    }
  } finally {
    setProgress(false);
  }
};

export const CreateLocalVolumeDiscovery: React.FC = () => {
  const { appName, ns } = useParams();
  const { t } = useCustomTranslation();

  const [nodesData, nodesLoaded, nodesLoadError] =
    useK8sWatchResource<NodeKind[]>(nodeResource);
  const [allNodes, setAllNodes] = React.useState([]);
  const [selectNodes, setSelectNodes] = React.useState([]);
  const [showSelectNodes, setShowSelectNodes] = React.useState(false);
  const [inProgress, setProgress] = React.useState(false);
  const [errorMessage, setError] = React.useState('');

  const navigate = useNavigate();

  React.useEffect(() => {
    if (nodesLoaded && !nodesLoadError && nodesData.length !== 0) {
      const filteredNodes: NodeKind[] = nodesData.filter(hasNoTaints);
      setAllNodes(filteredNodes);
    }
  }, [nodesData, nodesLoadError, nodesLoaded]);

  const nodes: NodeKind[] = showSelectNodes ? selectNodes : allNodes;
  const resourcePath = resourcePathFromModel(
    ClusterServiceVersionModel,
    appName,
    ns
  );

  const onSubmit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();
    const nodesByHostNameLabel: string[] = getNodesByHostNameLabel(nodes);
    const redirectionUrl = `/k8s/ns/${ns}/clusterserviceversions/${appName}/${referenceForModel(
      LocalVolumeDiscovery
    )}/${DISCOVERY_CR_NAME}`;
    makeLocalVolumeDiscoverRequest(
      nodesByHostNameLabel,
      ns,
      setError,
      setProgress,
      redirectionUrl,
      navigate
    );
  };

  return (
    <>
      <div className="odf-create-operand__header">
        <LocalVolumeDiscoveryHeader className="odf-create-operand__header-text" />
      </div>
      <Form
        noValidate={false}
        className="odf-m-pane__body odf-form-body__node-list"
        onSubmit={onSubmit}
      >
        <FormGroup
          label={t('Node Selector')}
          fieldId="auto-detect-volume--radio-group-node-selector"
        >
          <LocalVolumeDiscoveryBody
            allNodes={allNodes}
            selectNodes={selectNodes}
            showSelectNodes={showSelectNodes}
            setShowSelectNodes={() => setShowSelectNodes(!showSelectNodes)}
            setSelectNodes={setSelectNodes}
          />
        </FormGroup>
        <FormFooter
          inProgress={inProgress}
          errorMessage={errorMessage}
          disableNext={nodes.length < 1}
          cancelUrl={resourcePath}
        />
      </Form>
    </>
  );
};
