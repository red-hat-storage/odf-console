import * as React from 'react';
import {
  Button,
  Checkbox,
  ExpandableSection,
  FormGroup,
  TextInput,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { DRPolicyActionType, ManagedClusterInfoType } from '../utils/reducer';

export type S3Details = {
  bucketName: string;
  endpoint: string;
  accessKeyId: string;
  secretKey: string;
  region: string;
};

export type ClusterS3BucketDetailsFormProps = {
  selectedClusters: ManagedClusterInfoType[];
  cluster1Details: S3Details;
  cluster2Details: S3Details;
  useSameConnection: boolean;
  dispatch: React.Dispatch<any>;
};

export const ClusterS3BucketDetailsForm: React.FC<
  ClusterS3BucketDetailsFormProps
> = ({
  selectedClusters,
  cluster1Details,
  cluster2Details,
  useSameConnection,
  dispatch,
}) => {
  const [expanded1, setExpanded1] = React.useState(true);
  const [expanded2, setExpanded2] = React.useState(true);
  const [show1, setShow1] = React.useState(false);
  const [show2, setShow2] = React.useState(false);

  const name1 = selectedClusters[0]?.metadata?.name || 'cluster-1';
  const name2 = selectedClusters[1]?.metadata?.name || 'cluster-2';

  const update = (cluster: 1 | 2, field: keyof S3Details, val: string) => {
    dispatch({
      type:
        cluster === 1
          ? DRPolicyActionType.SET_CLUSTER1_S3_DETAILS
          : DRPolicyActionType.SET_CLUSTER2_S3_DETAILS,
      payload: {
        ...(cluster === 1 ? cluster1Details : cluster2Details),
        [field]: val,
      },
    });
  };

  return (
    <>
      <ExpandableSection
        toggleText={`S3 bucket for ${name1}`}
        isExpanded={expanded1}
        onToggle={(_e, exp) => setExpanded1(exp)}
      >
        <FormGroup fieldId="c1-bucket" label="Bucket name" isRequired>
          <TextInput
            id="c1-bucket"
            value={cluster1Details.bucketName}
            placeholder="Enter the bucket name"
            onChange={(_, v) => update(1, 'bucketName', v)}
          />
        </FormGroup>

        <FormGroup fieldId="c1-endpoint" label="Endpoint" isRequired>
          <TextInput
            id="c1-endpoint"
            value={cluster1Details.endpoint}
            placeholder="Enter the S3 endpoint"
            onChange={(_, v) => update(1, 'endpoint', v)}
          />
        </FormGroup>

        <FormGroup fieldId="c1-access" label="Access key ID" isRequired>
          <TextInput
            id="c1-access"
            value={cluster1Details.accessKeyId}
            placeholder="Enter the access key"
            onChange={(_, v) => update(1, 'accessKeyId', v)}
          />
        </FormGroup>

        <FormGroup fieldId="c1-secret" label="Secret key" isRequired>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TextInput
              type={show1 ? 'text' : 'password'}
              id="c1-secret"
              value={cluster1Details.secretKey}
              placeholder="Enter the secret key"
              onChange={(_, v) => update(1, 'secretKey', v)}
              style={{ flex: 1 }}
            />
            <Button
              variant="plain"
              onClick={() => setShow1((s) => !s)}
              aria-label="Toggle secret visibility"
            >
              {show1 ? <EyeSlashIcon /> : <EyeIcon />}
            </Button>
          </div>
        </FormGroup>

        <FormGroup fieldId="c1-region" label="Region" isRequired>
          <TextInput
            id="c1-region"
            value={cluster1Details.region}
            placeholder="Enter the region"
            onChange={(_, v) => update(1, 'region', v)}
          />
        </FormGroup>
      </ExpandableSection>

      <ExpandableSection
        toggleText={`S3 bucket for ${name2}`}
        isExpanded={expanded2}
        onToggle={(_e, exp) => setExpanded2(exp)}
      >
        <Checkbox
          id="use-same-conn"
          label="Use the same S3 connection details as the first cluster"
          isChecked={useSameConnection}
          onChange={(checked) =>
            dispatch({
              type: DRPolicyActionType.SET_USE_SAME_S3_CONNECTION,
              payload: checked,
            })
          }
        />

        <FormGroup fieldId="c2-bucket" label="Bucket name" isRequired>
          <TextInput
            id="c2-bucket"
            value={
              useSameConnection
                ? cluster1Details.bucketName
                : cluster2Details.bucketName
            }
            placeholder="Enter the bucket name"
            isDisabled={useSameConnection}
            onChange={(_, v) => update(2, 'bucketName', v)}
          />
        </FormGroup>

        <FormGroup fieldId="c2-endpoint" label="Endpoint" isRequired>
          <TextInput
            id="c2-endpoint"
            value={
              useSameConnection
                ? cluster1Details.endpoint
                : cluster2Details.endpoint
            }
            placeholder="Enter the S3 endpoint"
            isDisabled={useSameConnection}
            onChange={(_, v) => update(2, 'endpoint', v)}
          />
        </FormGroup>

        <FormGroup fieldId="c2-access" label="Access key ID" isRequired>
          <TextInput
            id="c2-access"
            value={
              useSameConnection
                ? cluster1Details.accessKeyId
                : cluster2Details.accessKeyId
            }
            placeholder="Enter the access key"
            isDisabled={useSameConnection}
            onChange={(_, v) => update(2, 'accessKeyId', v)}
          />
        </FormGroup>

        <FormGroup fieldId="c2-secret" label="Secret key" isRequired>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TextInput
              type={show2 ? 'text' : 'password'}
              id="c2-secret"
              value={
                useSameConnection
                  ? cluster1Details.secretKey
                  : cluster2Details.secretKey
              }
              placeholder="Enter the secret key"
              isDisabled={useSameConnection}
              onChange={(_, v) => update(2, 'secretKey', v)}
              style={{ flex: 1 }}
            />
            <Button
              variant="plain"
              onClick={() => setShow2((s) => !s)}
              aria-label="Toggle secret visibility"
              isDisabled={useSameConnection}
            >
              {show2 ? <EyeSlashIcon /> : <EyeIcon />}
            </Button>
          </div>
        </FormGroup>

        <FormGroup fieldId="c2-region" label="Region" isRequired>
          <TextInput
            id="c2-region"
            value={
              useSameConnection
                ? cluster1Details.region
                : cluster2Details.region
            }
            placeholder="Enter the region"
            isDisabled={useSameConnection}
            onChange={(_, v) => update(2, 'region', v)}
          />
        </FormGroup>
      </ExpandableSection>
    </>
  );
};

export default ClusterS3BucketDetailsForm;
