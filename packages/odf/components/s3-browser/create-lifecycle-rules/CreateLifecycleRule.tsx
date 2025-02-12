import * as React from 'react';
import {
  LifecycleRule,
  GetBucketLifecycleConfigurationCommandOutput,
  ExpirationStatus,
  LifecycleRuleFilter,
} from '@aws-sdk/client-s3';
import {
  NoobaaS3Provider,
  NoobaaS3Context,
} from '@odf/core/components/s3-browser/noobaa-context';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as _ from 'lodash-es';
import { useNavigate, useParams } from 'react-router-dom-v5-compat';
import useSWR from 'swr';
import {
  TextVariants,
  Text,
  TextContent,
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
import { isInvalidLifecycleRule } from './validations';

const getFilterConfig = (
  conditionalFilters: RuleState['conditionalFilters']
): LifecycleRuleFilter => {
  const prefix = conditionalFilters.prefix;
  const tags = conditionalFilters.objectTags;
  const minObjectSize = conditionalFilters.minObjectSize;
  const maxObjectSize = conditionalFilters.maxObjectSize;

  const filters = {
    ...(!!prefix ? { Prefix: prefix } : {}),
    ...(!!tags.length
      ? tags.length > 1
        ? { Tags: tags }
        : { Tag: tags[0] }
      : {}),
    ...(minObjectSize.isChecked
      ? { ObjectSizeGreaterThan: minObjectSize.sizeInB }
      : {}),
    ...(maxObjectSize.isChecked
      ? { ObjectSizeLessThan: maxObjectSize.sizeInB }
      : {}),
  };

  let ruleFilters: LifecycleRuleFilter;
  if (Object.keys(filters).length > 1 || filters.hasOwnProperty('Tags')) {
    ruleFilters = { And: filters };
  } else {
    ruleFilters = filters as LifecycleRuleFilter;
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
  existingRules: GetBucketLifecycleConfigurationCommandOutput
) => {
  const currRules: LifecycleRule[] = existingRules?.Rules || [];
  const newRule: LifecycleRule = getRuleConfig(state);
  return [...currRules, newRule];
};

const Header: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  return (
    <>
      <TextContent>
        <Text component={TextVariants.h1}>{t('Create lifecycle rule')}</Text>
        <Text component={TextVariants.small}>
          {t(
            'To optimize the storage costs of your objects throughout their lifecycle, set up a lifecycle configuration. This configuration consists of a series of rules that determine the actions S3 takes on a specific group of objects.'
          )}
        </Text>
      </TextContent>
      <Divider className="pf-v5-u-my-lg" />
    </>
  );
};

const CreateLifecycleRuleForm: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  const { bucketName } = useParams();
  const navigate = useNavigate();
  const { noobaaS3 } = React.useContext(NoobaaS3Context);

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [putError, setPutError] = React.useState<Error>();
  const [state, dispatch] = React.useReducer(ruleReducer, ruleInitialState);

  const {
    data: existingRules,
    isLoading,
    error: getError,
    mutate,
  } = useSWR(`${bucketName}-${BUCKET_LIFECYCLE_RULE_CACHE_KEY_SUFFIX}`, () =>
    noobaaS3.getBucketLifecycleConfiguration({ Bucket: bucketName })
  );

  const noRuleExists =
    getError?.name === 'NoSuchLifecycleConfiguration' &&
    !existingRules?.Rules?.length;

  const onSave = async (event) => {
    event.preventDefault();
    setInProgress(true);

    if (isInvalidLifecycleRule(state, existingRules)) {
      dispatch({
        type: RuleActionType.TRIGGER_INLINE_VALIDATIONS,
        payload: true,
      });
      setInProgress(false);
    } else {
      try {
        await noobaaS3.putBucketLifecycleConfiguration({
          Bucket: bucketName,
          LifecycleConfiguration: {
            Rules: createNewRule(state, existingRules),
          },
        });

        setInProgress(false);
        mutate();
        // ToDo: navigate to list/details page
      } catch (err) {
        setInProgress(false);
        setPutError(err);
      }
    }
  };

  if (isLoading || (getError && !noRuleExists)) {
    return (
      <StatusBox loaded={!isLoading} loadError={isLoading ? '' : getError} />
    );
  }

  return (
    <div className="pf-v5-u-m-md">
      <Header />
      <GeneralConfigAndFilters
        state={state}
        dispatch={dispatch}
        existingRules={existingRules}
      />
      <RuleActions state={state} dispatch={dispatch} />
      <ButtonBar
        inProgress={inProgress}
        errorMessage={putError?.message || putError}
        className="pf-v5-u-mt-lg pf-v5-u-mb-md"
      >
        <span>
          <Button
            variant={ButtonVariant.primary}
            onClick={onSave}
            className="pf-v5-u-mr-xs"
          >
            {t('Create')}
          </Button>
          <Button
            variant={ButtonVariant.secondary}
            onClick={() => navigate(-1)}
            className="pf-v5-u-ml-xs"
          >
            {t('Cancel')}
          </Button>
        </span>
      </ButtonBar>
    </div>
  );
};

const CreateLifecycleRule: React.FC<{}> = () => (
  <NoobaaS3Provider>
    <CreateLifecycleRuleForm />
  </NoobaaS3Provider>
);

export default CreateLifecycleRule;
