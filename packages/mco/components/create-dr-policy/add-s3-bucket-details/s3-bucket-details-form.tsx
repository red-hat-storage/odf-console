import * as React from 'react';
import { getName, useCustomTranslation } from '@odf/shared';
import {
  Button,
  Checkbox,
  Divider,
  ExpandableSection,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { DRPolicyActionType, ManagedClusterInfoType } from '../utils/reducer';

export type S3Details = {
  clusterName: string;
  bucketName: string;
  endpoint: string;
  accessKeyId: string;
  secretKey: string;
  region: string;
  s3ProfileName: string;
};

type ClusterS3BucketDetailsFormProps = {
  selectedClusters: ManagedClusterInfoType[];
  cluster1Details: S3Details;
  cluster2Details: S3Details;
  useSameConnection: boolean;
  dispatch: React.Dispatch<any>;
  areDRClustersAlreadyCreated?: boolean;
};

export const ClusterS3BucketDetailsForm: React.FC<
  ClusterS3BucketDetailsFormProps
> = ({
  selectedClusters,
  cluster1Details,
  cluster2Details,
  useSameConnection,
  areDRClustersAlreadyCreated,
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

  React.useEffect(() => {
    if (useSameConnection) {
      dispatch({
        type: DRPolicyActionType.SET_CLUSTER2_S3_DETAILS,
        payload: { ...cluster1Details, clusterName: name2 },
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
    } else if (
      !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(details.bucketName) ||
      details.bucketName.length < 3 ||
      details.bucketName.length > 63
    ) {
      errs.bucketName = t(
        'Bucket name must be 3-63 characters, lowercase letters, numbers, dots, and hyphens'
      );
    }

    if (!details.endpoint.trim()) {
      errs.endpoint = t('This field is required');
    } else if (!/^https?:\/\/.+/.test(details.endpoint)) {
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

    if (!details.s3ProfileName.trim()) {
      errs.s3ProfileName = t('This field is required');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(details.s3ProfileName)) {
      errs.s3ProfileName = t(
        'Profile name can only contain letters, numbers, hyphens, and underscores'
      );
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
    { key: 's3ProfileName', label: t('S3 profile name') },
  ];

  const inputPadding = 'pf-v5-u-p-sm pf-v5-u-w-75';

  return (
    <div className="pf-v5-u-p-md">
      <ExpandableSection
        toggleText={
          areDRClustersAlreadyCreated
            ? t(`Previously used S3 bucket for {{name}}`, { name: name1 })
            : t(`S3 bucket for {{name}}`, { name: name1 })
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
                    onBlur={() => handleBlur(1)}
                  />
                </FlexItem>
                <FlexItem>
                  <Button
                    icon={show1 ? <EyeSlashIcon /> : <EyeIcon />}
                    variant="plain"
                    onClick={() => setShow1((s) => !s)}
                    aria-label={t('Toggle secret visibility')}
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
      <Divider className="pf-v5-u-p-md" />
      <ExpandableSection
        toggleText={
          areDRClustersAlreadyCreated
            ? t(`Previously used S3 bucket for {{name}}`, { name: name2 })
            : t(`S3 bucket for {{name}}`, { name: name2 })
        }
        isExpanded={expanded2}
        onToggle={(_, exp) => setExpanded2(exp)}
        isIndented
      >
        <Checkbox
          id="use-same-conn"
          label={t('Use the same S3 connection details as the first cluster')}
          isChecked={useSameConnection}
          onChange={onToggleSame}
        />
        {fields.map(({ key, label }) => (
          <FormGroup
            key={key}
            fieldId={`c2-${key}`}
            label={label}
            isRequired
            className={inputPadding}
          >
            {key === 'secretKey' ? (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <TextInput
                  type={show2 ? 'text' : 'password'}
                  id={`c2-${key}`}
                  value={cluster2Details[key]}
                  placeholder={t('Enter the {{label}}', {
                    label: label.toLowerCase(),
                  })}
                  onChange={(_, v) => update(2, key, v)}
                  validated={errors2[key] ? 'error' : 'default'}
                  isDisabled={useSameConnection}
                  style={{ flex: 1 }}
                  onBlur={() => handleBlur(2)}
                />
                <Button
                  icon={show2 ? <EyeSlashIcon /> : <EyeIcon />}
                  variant="plain"
                  onClick={() => setShow2((s) => !s)}
                  aria-label={t('Toggle secret visibility')}
                  isDisabled={useSameConnection}
                />
              </div>
            ) : (
              <TextInput
                id={`c2-${key}`}
                value={cluster2Details[key]}
                placeholder={t('Enter the {{label}}', {
                  label: label.toLowerCase(),
                })}
                onChange={(_, v) => update(2, key, v)}
                validated={errors2[key] ? 'error' : 'default'}
                isDisabled={useSameConnection}
                onBlur={() => handleBlur(2)}
              />
            )}
            {errors2[key] && <FormHelperText>{errors2[key]}</FormHelperText>}
          </FormGroup>
        ))}
      </ExpandableSection>
    </div>
  );
};
