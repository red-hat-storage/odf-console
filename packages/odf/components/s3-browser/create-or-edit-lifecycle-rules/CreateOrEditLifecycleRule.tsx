import * as React from 'react';
import {
  LifecycleRule,
  GetBucketLifecycleConfigurationCommandOutput,
  ExpirationStatus,
  LifecycleRuleFilter,
} from '@aws-sdk/client-s3';
import {
  S3Provider,
  S3Context,
} from '@odf/core/components/s3-browser/s3-context';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { StatusBox } from '@odf/shared/generic/status-box';
import { isNoLifecycleRuleError } from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { deepSortObject } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { murmur3 } from 'murmurhash-js';
import { useNavigate, useParams } from 'react-router-dom-v5-compat';
import useSWR from 'swr';
import {
  ContentVariants,
  Content,
  Divider,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';
import { BUCKET_LIFECYCLE_RULE_CACHE_KEY_SUFFIX } from '../../../constants';
import { GeneralConfigAndFilters } from './GeneralConfigAndFilters';
import {
  ruleReducer,
  ruleInitialState,
  RuleActionType,
  RuleState,
  RuleScope,
} from './reducer';
import { RuleActions } from './RuleActions';
import { useEditLifecycleRule } from './useEditLifecycleRule';
import { isInvalidLifecycleRule } from './validations';

type IsEditProp = { isEdit?: boolean };

const getFilterConfig = (
  conditionalFilters: RuleState['conditionalFilters']
): LifecycleRuleFilter => {
  const prefix = conditionalFilters.prefix;
  const tags = conditionalFilters.objectTags;
  const minObjectSize = conditionalFilters.minObjectSize;
  const maxObjectSize = conditionalFilters.maxObjectSize;

  const filtersWOTags = {
    ...(!!prefix ? { Prefix: prefix } : {}),
    ...(minObjectSize.isChecked
      ? { ObjectSizeGreaterThan: minObjectSize.sizeInB }
      : {}),
    ...(maxObjectSize.isChecked
      ? { ObjectSizeLessThan: maxObjectSize.sizeInB }
      : {}),
  };

  let ruleFilters: LifecycleRuleFilter;
  const filtersWOTagsLength = Object.keys(filtersWOTags).length;
  if (filtersWOTagsLength > 1 || tags.length > 1) {
    ruleFilters = {
      And: { ...filtersWOTags, ...(!!tags.length ? { Tags: tags } : {}) },
    };
  } else if (filtersWOTagsLength === 1 && tags.length === 1) {
    ruleFilters = { And: { ...filtersWOTags, Tags: tags } };
  } else {
    ruleFilters = {
      ...filtersWOTags,
      ...(!!tags.length ? { Tag: tags[0] } : {}),
    } as LifecycleRuleFilter;
  }

  return ruleFilters;
};

const getRuleConfig = (state: RuleState): LifecycleRule => {
  const deleteCurrent = state.actions.deleteCurrent;
  const deleteExpiredMarkers = state.actions.deleteExpiredMarkers;
  const conditionalFilters = state.conditionalFilters;
  const deleteNonCurrent = state.actions.deleteNonCurrent;
  const deleteIncompleteMultiparts = state.actions.deleteIncompleteMultiparts;

  const expirationConfig = {
    ...(deleteCurrent.isChecked ? { Days: deleteCurrent.days } : {}),
    ...(deleteExpiredMarkers
      ? { ExpiredObjectDeleteMarker: deleteExpiredMarkers }
      : {}),
  };
  const nonCurrentConfig = {
    ...(deleteNonCurrent.isChecked
      ? { NoncurrentDays: deleteNonCurrent.days }
      : {}),
    ...(deleteNonCurrent.isChecked && !!deleteNonCurrent.retention
      ? { NewerNoncurrentVersions: deleteNonCurrent.retention }
      : {}),
  };
  const multipartConfig = {
    ...(deleteIncompleteMultiparts.isChecked
      ? { DaysAfterInitiation: deleteIncompleteMultiparts.days }
      : {}),
  };

  return {
    ...(!_.isEmpty(expirationConfig) ? { Expiration: expirationConfig } : {}),
    ID: state.name,
    ...(state.scope === RuleScope.TARGETED
      ? { Filter: getFilterConfig(conditionalFilters) }
      : { Filter: { Prefix: '' } }), // omitting or empty "Filter" results in error, using `{ Prefix: '' }` as a workaround for "global" scope.
    Status: ExpirationStatus.Enabled,
    ...(!_.isEmpty(nonCurrentConfig)
      ? { NoncurrentVersionExpiration: nonCurrentConfig }
      : {}),
    ...(!_.isEmpty(multipartConfig)
      ? { AbortIncompleteMultipartUpload: multipartConfig }
      : {}),
  };
};

const createNewRule = (
  state: RuleState,
  latestRules: GetBucketLifecycleConfigurationCommandOutput
) => {
  const currRules: LifecycleRule[] =
    latestRules?.Rules?.filter((rule) => rule.ID !== state.name) || [];
  const newRule: LifecycleRule = getRuleConfig(state);

  return [...currRules, newRule];
};

const updateExistingRule = (
  state: RuleState,
  latestRules: GetBucketLifecycleConfigurationCommandOutput,
  ruleName: string,
  ruleHash: string
) => {
  let filteredRules: LifecycleRule[];
  if (!!ruleName) {
    filteredRules =
      latestRules?.Rules?.filter(
        (rule) => rule.ID !== ruleName && rule.ID !== state.name
      ) || [];
  } else if (!!ruleHash) {
    // fallback if rule name (ID) is missing
    filteredRules =
      latestRules?.Rules?.filter(
        (rule) =>
          `${murmur3(JSON.stringify(deepSortObject(rule)))}` !== ruleHash &&
          rule.ID !== state.name
      ) || [];
  } else {
    filteredRules = latestRules?.Rules || [];
  }
  const updateRule: LifecycleRule = getRuleConfig(state);

  return [...filteredRules, updateRule];
};

const Header: React.FC<IsEditProp> = ({ isEdit }) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <Content>
        <Content component={ContentVariants.h1}>
          {isEdit ? t('Edit lifecycle rule') : t('Create lifecycle rule')}
        </Content>
        <Content component={ContentVariants.small}>
          {t(
            'To optimize the storage costs of your objects throughout their lifecycle, set up a lifecycle configuration. This configuration consists of a series of rules that determine the actions S3 takes on a specific group of objects.'
          )}
        </Content>
      </Content>
      <Divider className="pf-v6-u-my-lg" />
    </>
  );
};

const CreateOrEditLifecycleRuleForm: React.FC<IsEditProp> = ({ isEdit }) => {
  const { t } = useCustomTranslation();

  const { bucketName } = useParams();
  const navigate = useNavigate();
  const { s3Client } = React.useContext(S3Context);

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [putError, setPutError] = React.useState<Error>();
  const [state, dispatch] = React.useReducer(ruleReducer, ruleInitialState);

  const {
    data,
    isLoading,
    error: getError,
    mutate,
  } = useSWR(
    `${s3Client.providerType}-${bucketName}-${BUCKET_LIFECYCLE_RULE_CACHE_KEY_SUFFIX}`,
    () => s3Client.getBucketLifecycleConfiguration({ Bucket: bucketName }),
    {
      shouldRetryOnError: false,
    }
  );

  const noRuleExistsError = isNoLifecycleRuleError(getError);
  // in case of "noRuleExistsError" error, cache could still have older "data", hence clearing that.
  const existingRules = noRuleExistsError ? undefined : data;

  const [ruleName, ruleHash] = useEditLifecycleRule({
    isEdit,
    existingRules,
    dispatch,
  });

  const onSave = async (event) => {
    event.preventDefault();
    setInProgress(true);

    if (isInvalidLifecycleRule(state, existingRules, isEdit, ruleName)) {
      dispatch({
        type: RuleActionType.TRIGGER_INLINE_VALIDATIONS,
        payload: true,
      });
      setInProgress(false);
    } else {
      try {
        let latestRules: GetBucketLifecycleConfigurationCommandOutput;

        try {
          latestRules = await s3Client.getBucketLifecycleConfiguration({
            Bucket: bucketName,
          });
        } catch (err) {
          if (isNoLifecycleRuleError(err)) {
            latestRules = {
              Rules: [],
            } as GetBucketLifecycleConfigurationCommandOutput;
          } else {
            throw err;
          }
        }

        await s3Client.putBucketLifecycleConfiguration({
          Bucket: bucketName,
          LifecycleConfiguration: {
            Rules: isEdit
              ? updateExistingRule(state, latestRules, ruleName, ruleHash)
              : createNewRule(state, latestRules),
          },
        });

        setInProgress(false);
        mutate();
        navigate(-1);
      } catch (err) {
        setInProgress(false);
        setPutError(err);
      }
    }
  };

  if (isLoading || (getError && !noRuleExistsError)) {
    return (
      <StatusBox loaded={!isLoading} loadError={isLoading ? '' : getError} />
    );
  }

  return (
    <div className="pf-v6-u-m-md">
      <Header isEdit={isEdit} />
      <GeneralConfigAndFilters
        state={state}
        dispatch={dispatch}
        existingRules={existingRules}
        isEdit={isEdit}
        editingRuleName={ruleName}
      />
      <RuleActions state={state} dispatch={dispatch} />
      <ButtonBar
        inProgress={inProgress}
        errorMessage={putError?.message || JSON.stringify(putError)}
        className="pf-v6-u-mt-lg pf-v6-u-mb-md"
      >
        <span>
          <Button
            variant={ButtonVariant.primary}
            onClick={onSave}
            isDisabled={inProgress}
            className="pf-v6-u-mr-xs"
          >
            {isEdit ? t('Save') : t('Create')}
          </Button>
          <Button
            variant={ButtonVariant.secondary}
            onClick={() => navigate(-1)}
            className="pf-v6-u-ml-xs"
          >
            {t('Cancel')}
          </Button>
        </span>
      </ButtonBar>
    </div>
  );
};

export const CreateLifecycleRule: React.FC<{}> = () => (
  <S3Provider>
    <CreateOrEditLifecycleRuleForm />
  </S3Provider>
);

export const EditLifecycleRule: React.FC<{}> = () => (
  <S3Provider>
    <CreateOrEditLifecycleRuleForm isEdit />
  </S3Provider>
);
