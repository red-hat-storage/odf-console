import * as React from 'react';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { DeploymentModel } from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import { DeploymentKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel, resourcePathFromModel } from '@odf/shared/utils';
import {
  k8sCreate,
  K8sKind,
  k8sPatch,
} from '@openshift-console/dynamic-plugin-sdk';
import { History } from 'history';
import { match as Match } from 'react-router';
import {
  Form,
  FormGroup,
  Radio,
  ActionGroup,
  Button,
} from '@patternfly/react-core';
import { NooBaaObjectBucketClaimModel } from '../../models';
import { getAttachOBCPatch } from '../../utils';
import { CreateOBCForm } from '../mcg/CreateObjectBucketClaim';
import { commonReducer, defaultState } from '../mcg/state';
import './AttachOBC.scss';

const AttachStorage: React.FC<AttachStorageProps> = (props) => {
  const { t } = useCustomTranslation();
  const [state, dispatch] = React.useReducer(commonReducer, defaultState);
  const [createOBC, setCreateOBC] = React.useState(false);
  const [selectedOBC, setSelectedOBC] = React.useState(null);
  const { kindObj, namespace, resourceName, history } = props;

  const [deployment, loaded, loadError] = useK8sGet<DeploymentKind>(
    kindObj,
    resourceName,
    namespace
  );

  const onSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    try {
      let obc = selectedOBC;
      if (createOBC) {
        dispatch({ type: 'setProgress' });
        const obj = await k8sCreate({
          model: NooBaaObjectBucketClaimModel,
          data: state.payload,
        });
        obc = getName(obj);
      }
      const patch = getAttachOBCPatch(obc, deployment);
      const patchedObj = await k8sPatch({
        model: DeploymentModel,
        resource: deployment,
        data: patch,
      });
      dispatch({ type: 'unsetProgress' });
      history.push(
        `${resourcePathFromModel(
          DeploymentModel,
          getName(patchedObj),
          getNamespace(patchedObj)
        )}/environment`
      );
    } catch (err) {
      dispatch({ type: 'unsetProgress' });
      dispatch({ type: 'setError', message: err.message });
    }
  };

  const onRadioToggle = () => setCreateOBC((val) => !val);

  return (
    <Form onSubmit={onSubmit} className="co-m-pane__body-group co-m-pane__form">
      <FormGroup fieldId="exists" label={t('ObjectBucketClaim')} isRequired>
        <Radio
          label={t('Use existing claim')}
          value="exists"
          key="exists"
          onChange={onRadioToggle}
          id="exists"
          name="exists"
          isChecked={!createOBC}
        />
        {!createOBC && (
          <div className="odf-attach-obc__subgroup">
            <ResourceDropdown
              resourceModel={NooBaaObjectBucketClaimModel}
              resource={{
                kind: referenceForModel(NooBaaObjectBucketClaimModel),
                namespace,
                namespaced: true,
                isList: true,
              }}
              onSelect={(item) => setSelectedOBC(item)}
            />
          </div>
        )}
      </FormGroup>
      <FormGroup fieldId="create">
        <Radio
          label={t('Create new claim')}
          value="create"
          key="create"
          onChange={onRadioToggle}
          id="create"
          name="create"
          isChecked={createOBC}
        />
        {createOBC && (
          <div className="ceph-attach-obc__subgroup">
            <CreateOBCForm
              state={state}
              dispatch={dispatch}
              namespace={namespace}
            />
          </div>
        )}
      </FormGroup>
      <ButtonBar
        errorMessage={state.error || loadError?.message}
        inProgress={state.progress}
      >
        <ActionGroup className="pf-c-form">
          <Button
            type="submit"
            variant="primary"
            disabled={loadError || !loaded}
          >
            {t('Create')}
          </Button>
          <Button onClick={history.goBack} type="button" variant="secondary">
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </ButtonBar>
    </Form>
  );
};

const AttachStorageWrapper: React.FC<AttachStorageWrapperProps> = (props) => {
  const {
    kindObj,
    kindsInFlight,
    match: { params },
  } = props;
  return !kindObj && kindsInFlight ? (
    <LoadingBox />
  ) : (
    <AttachStorage
      namespace={params.ns}
      resourceName={params.name}
      {...props}
    />
  );
};

type AttachStorageWrapperProps = {
  kindObj: K8sKind;
  kindsInFlight: any;
  match?: Match<{ ns: string; name: string }>;
  history: History;
};

type AttachStorageProps = AttachStorageWrapperProps & {
  namespace: string;
  resourceName: string;
};

export default AttachStorageWrapper;
