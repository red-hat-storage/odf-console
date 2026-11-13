import * as React from 'react';
import { MAX_ALLOWED_CLUSTERS } from '@odf/mco/constants';
import { ManagedClusterInfoType, S3Details } from '@odf/mco/types';
import { getName, useCustomTranslation } from '@odf/shared';
import {
  Button,
  Checkbox,
  Divider,
  ExpandableSection,
  Flex,
  FlexItem,
  FormGroup,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { DRPolicyAction, DRPolicyActionType } from '../../../utils/reducer';
import {
  isValidBucketName,
  isValidEndpoint,
} from '../../../utils/s3-validators';

type ClusterS3BucketDetailsFormProps = {
  selectedClusters: ManagedClusterInfoType[];
  cluster1Details: S3Details;
  cluster2Details: S3Details;
  useSameConnection: boolean;
  dispatch: React.Dispatch<DRPolicyAction>;
  /**
   * Clusters already backed by an S3Configuration. Its spec is immutable, so
   * their details are shown read-only rather than as editable inputs.
   */
  clustersWithS3Configuration: Set<string>;
};

export const ClusterS3BucketDetailsForm: React.FC<
  ClusterS3BucketDetailsFormProps
> = ({
  selectedClusters,
  cluster1Details,
  cluster2Details,
  useSameConnection,
  clustersWithS3Configuration,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [expanded1, setExpanded1] = React.useState(true);
  const [expanded2, setExpanded2] = React.useState(true);
  const [show1, setShow1] = React.useState(false);
  const [show2, setShow2] = React.useState(false);

  const [errors1, setErrors1] = React.useState<Partial<S3Details>>({});
  const [errors2, setErrors2] = React.useState<Partial<S3Details>>({});

  const name1 = getName(selectedClusters[0]) || 'cluster-1';
  const name2 = getName(selectedClusters[1]) || 'cluster-2';

  const cluster1Exists = clustersWithS3Configuration.has(name1);
  const cluster2Exists = clustersWithS3Configuration.has(name2);
  const allClustersExist =
    clustersWithS3Configuration.size === MAX_ALLOWED_CLUSTERS;

  React.useEffect(() => {
    if (useSameConnection) {
      // Both clusters share the same bucket and credentials. They still get one
      // S3Configuration each; the profile name is derived from the cluster name,
      // so there is nothing cluster-specific left to preserve here.
      dispatch({
        type: DRPolicyActionType.SET_CLUSTER2_S3_DETAILS,
        payload: {
          ...cluster1Details,
          clusterName: name2,
        },
      });
      setErrors2({});
    }
  }, [useSameConnection, cluster1Details, dispatch, name2]);

  const handleBlur = (cluster: 1 | 2) => {
    const details = cluster === 1 ? cluster1Details : cluster2Details;
    validate(cluster, details);
  };

  const validate = (cluster: 1 | 2, details: S3Details) => {
    const errs: Partial<S3Details> = {};

    if (!details.bucketName.trim()) {
      errs.bucketName = t('This field is required');
    } else if (!isValidBucketName(details.bucketName)) {
      errs.bucketName = t(
        'Bucket name must be 3-63 characters, lowercase letters, numbers, dots, and hyphens. No consecutive dots, dot-hyphen adjacency, or IP address format.'
      );
    }

    if (!details.endpoint.trim()) {
      errs.endpoint = t('This field is required');
    } else if (!isValidEndpoint(details.endpoint)) {
      errs.endpoint = t('Endpoint must be a valid URL (http:// or https://)');
    }

    if (!details.accessKeyId.trim()) {
      errs.accessKeyId = t('This field is required');
    }

    if (!details.secretKey.trim()) {
      errs.secretKey = t('This field is required');
    }

    if (!details.region.trim()) {
      errs.region = t('This field is required');
    }

    cluster === 1 ? setErrors1(errs) : setErrors2(errs);
    return Object.keys(errs).length === 0;
  };

  const update = (cluster: 1 | 2, field: keyof S3Details, val: string) => {
    const base = cluster === 1 ? cluster1Details : cluster2Details;
    const clusterName = cluster === 1 ? name1 : name2;

    const payload: S3Details = {
      ...base,
      [field]: val,
      clusterName,
    };

    dispatch({
      type:
        cluster === 1
          ? DRPolicyActionType.SET_CLUSTER1_S3_DETAILS
          : DRPolicyActionType.SET_CLUSTER2_S3_DETAILS,
      payload,
    });

    validate(cluster, payload);
  };

  const onToggleSame = (_e, checked: boolean) => {
    dispatch({
      type: DRPolicyActionType.SET_USE_SAME_S3_CONNECTION,
      payload: checked,
    });
  };

  const fields: Array<{ key: keyof S3Details; label: string }> = [
    { key: 'bucketName', label: t('Bucket name') },
    { key: 'endpoint', label: t('Endpoint') },
    { key: 'accessKeyId', label: t('Access key ID') },
    { key: 'secretKey', label: t('Secret key') },
    { key: 'region', label: t('Region') },
  ];

  const inputPadding = 'pf-v6-u-p-sm pf-v6-u-w-75';

  return (
    <div className="pf-v6-u-p-md">
      <ExpandableSection
        toggleText={
          cluster1Exists
            ? t('Previously used S3 bucket for {{name}}', { name: name1 })
            : t('S3 bucket for {{name}}', { name: name1 })
        }
        isExpanded={expanded1}
        onToggle={(_, exp) => setExpanded1(exp)}
        isIndented
      >
        {fields.map(({ key, label }) => (
          <FormGroup
            key={key}
            fieldId={`c1-${key}`}
            label={label}
            isRequired
            className={inputPadding}
          >
            {key === 'secretKey' ? (
              <Flex alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem flex={{ default: 'flex_1' }}>
                  <TextInput
                    type={show1 ? 'text' : 'password'}
                    id={`c1-${key}`}
                    value={cluster1Details[key]}
                    placeholder={t('Enter the {{label}}', {
                      label: label.toLowerCase(),
                    })}
                    onChange={(_, v) => update(1, key, v)}
                    validated={errors1[key] ? 'error' : 'default'}
                    isDisabled={cluster1Exists}
                    onBlur={() => handleBlur(1)}
                  />
                </FlexItem>
                <FlexItem>
                  <Button
                    icon={show1 ? <EyeSlashIcon /> : <EyeIcon />}
                    variant="plain"
                    onClick={() => setShow1((s) => !s)}
                    aria-label={t('Toggle secret visibility')}
                    isDisabled={cluster1Exists}
                  />
                </FlexItem>
              </Flex>
            ) : (
              <TextInput
                id={`c1-${key}`}
                value={cluster1Details[key]}
                placeholder={t('Enter the {{label}}', {
                  label: label.toLowerCase(),
                })}
                onChange={(_, v) => update(1, key, v)}
                validated={errors1[key] ? 'error' : 'default'}
                isDisabled={cluster1Exists}
                onBlur={() => handleBlur(1)}
              />
            )}
            {errors1[key] && (
              <HelperText>
                <HelperTextItem variant="error">{errors1[key]}</HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
        ))}
      </ExpandableSection>
      <Divider className="pf-v6-u-p-md" />
      <ExpandableSection
        toggleText={
          cluster2Exists
            ? t('Previously used S3 bucket for {{name}}', { name: name2 })
            : t('S3 bucket for {{name}}', { name: name2 })
        }
        isExpanded={expanded2}
        onToggle={(_, exp) => setExpanded2(exp)}
        isIndented
      >
        {!allClustersExist && (
          <Checkbox
            id="use-same-conn"
            label={t('Use the same S3 connection details as the first cluster')}
            isChecked={useSameConnection}
            onChange={onToggleSame}
          />
        )}
        {fields.map(({ key, label }) => (
          <FormGroup
            key={key}
            fieldId={`c2-${key}`}
            label={label}
            isRequired
            className={inputPadding}
          >
            {key === 'secretKey' ? (
              <Flex alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem flex={{ default: 'flex_1' }}>
                  <TextInput
                    type={show2 ? 'text' : 'password'}
                    id={`c2-${key}`}
                    value={cluster2Details[key]}
                    placeholder={t('Enter the {{label}}', {
                      label: label.toLowerCase(),
                    })}
                    onChange={(_, v) => update(2, key, v)}
                    validated={errors2[key] ? 'error' : 'default'}
                    isDisabled={useSameConnection || cluster2Exists}
                    onBlur={() => handleBlur(2)}
                  />
                </FlexItem>
                <FlexItem>
                  <Button
                    icon={show2 ? <EyeSlashIcon /> : <EyeIcon />}
                    variant="plain"
                    onClick={() => setShow2((s) => !s)}
                    aria-label={t('Toggle secret visibility')}
                    isDisabled={useSameConnection || cluster2Exists}
                  />
                </FlexItem>
              </Flex>
            ) : (
              <TextInput
                id={`c2-${key}`}
                value={cluster2Details[key]}
                placeholder={t('Enter the {{label}}', {
                  label: label.toLowerCase(),
                })}
                onChange={(_, v) => update(2, key, v)}
                validated={errors2[key] ? 'error' : 'default'}
                isDisabled={cluster2Exists || useSameConnection}
                onBlur={() => handleBlur(2)}
              />
            )}
            {errors2[key] && (
              <HelperText>
                <HelperTextItem variant="error">{errors2[key]}</HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
        ))}
      </ExpandableSection>
    </div>
  );
};
