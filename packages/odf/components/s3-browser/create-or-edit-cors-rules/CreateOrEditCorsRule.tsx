import * as React from 'react';
import { CORSRule, GetBucketCorsCommandOutput } from '@aws-sdk/client-s3';
import {
  NoobaaS3Provider,
  NoobaaS3Context,
} from '@odf/core/components/s3-browser/noobaa-context';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { StatusBox } from '@odf/shared/generic/status-box';
import { isNoCorsRuleError } from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { deepSortObject } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { murmur3 } from 'murmurhash-js';
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
import { BUCKET_CORS_RULE_CACHE_KEY_SUFFIX } from '../../../constants';
import { CorsFormContents } from './CorsFormContents';
import {
  ruleReducer,
  ruleInitialState,
  RuleActionType,
  RuleState,
} from './reducer';
import { useEditCorsRule } from './useEditCorsRule';
import { isInvalidCorsRule } from './validations';

type IsEditProp = { isEdit?: boolean };

const getRuleConfig = (state: RuleState): CORSRule => {
  const allowedOrigins = state.allowedOrigins;
  const allowedMethods = state.allowedMethods;
  const allowedHeaders = state.allowedHeaders;
  const exposedHeaders = state.exposedHeaders;
  const maxAge = state.maxAge;

  return {
    ID: state.name,
    ...(!!allowedHeaders.length ? { AllowedHeaders: allowedHeaders } : {}),
    AllowedMethods: allowedMethods,
    AllowedOrigins: allowedOrigins,
    ...(!!exposedHeaders.length ? { ExposeHeaders: exposedHeaders } : {}),
    ...(!!maxAge ? { MaxAgeSeconds: maxAge } : {}),
  };
};

const createNewRule = (
  state: RuleState,
  latestRules: GetBucketCorsCommandOutput
) => {
  const currRules: CORSRule[] =
    latestRules?.CORSRules?.filter((rule) => rule.ID !== state.name) || [];
  const newRule: CORSRule = getRuleConfig(state);

  return [...currRules, newRule];
};

const updateExistingRule = (
  state: RuleState,
  latestRules: GetBucketCorsCommandOutput,
  ruleName: string,
  ruleHash: string
) => {
  let filteredRules: CORSRule[];
  if (!!ruleName) {
    filteredRules =
      latestRules?.CORSRules?.filter(
        (rule) => rule.ID !== ruleName && rule.ID !== state.name
      ) || [];
  } else if (!!ruleHash) {
    // fallback if rule name (ID) is missing
    filteredRules =
      latestRules?.CORSRules?.filter(
        (rule) =>
          `${murmur3(JSON.stringify(deepSortObject(rule)))}` !== ruleHash &&
          rule.ID !== state.name
      ) || [];
  } else {
    filteredRules = latestRules?.CORSRules || [];
  }
  const updateRule: CORSRule = getRuleConfig(state);

  return [...filteredRules, updateRule];
};

const Header: React.FC<IsEditProp> = ({ isEdit }) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <TextContent>
        <Text component={TextVariants.h1}>
          {isEdit ? t('Edit CORS rule') : t('Create CORS rule')}
        </Text>
        <Text component={TextVariants.small}>
          {t(
            'The CORS configuration, defines a way for client web applications that are loaded in one domain to interact with resources in a different domain.'
          )}
        </Text>
      </TextContent>
      <Divider className="pf-v5-u-my-lg" />
    </>
  );
};

const CreateOrEditCorsForm: React.FC<IsEditProp> = ({ isEdit }) => {
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
  } = useSWR(
    `${bucketName}-${BUCKET_CORS_RULE_CACHE_KEY_SUFFIX}`,
    () => noobaaS3.getBucketCors({ Bucket: bucketName }),
    {
      shouldRetryOnError: false,
    }
  );

  const [ruleName, ruleHash] = useEditCorsRule({
    isEdit,
    existingRules,
    dispatch,
  });

  const noRuleExists =
    isNoCorsRuleError(getError) && !existingRules?.CORSRules?.length;

  const onSave = async (event) => {
    event.preventDefault();
    setInProgress(true);

    if (isInvalidCorsRule(state, existingRules, isEdit, ruleName)) {
      dispatch({
        type: RuleActionType.TRIGGER_INLINE_VALIDATIONS,
        payload: true,
      });
      setInProgress(false);
    } else {
      try {
        let latestRules: GetBucketCorsCommandOutput;

        try {
          latestRules = await noobaaS3.getBucketCors({ Bucket: bucketName });
        } catch (err) {
          if (isNoCorsRuleError(err)) {
            latestRules = { CORSRules: [] } as GetBucketCorsCommandOutput;
          } else {
            throw err;
          }
        }

        await noobaaS3.putBucketCors({
          Bucket: bucketName,
          CORSConfiguration: {
            CORSRules: isEdit
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

  if (isLoading || (getError && !noRuleExists)) {
    return (
      <StatusBox loaded={!isLoading} loadError={isLoading ? '' : getError} />
    );
  }

  return (
    <div className="pf-v5-u-m-md">
      <Header isEdit={isEdit} />
      <CorsFormContents
        state={state}
        dispatch={dispatch}
        existingRules={existingRules}
        isEdit={isEdit}
        editingRuleName={ruleName}
      />
      <ButtonBar
        inProgress={inProgress}
        errorMessage={putError?.message || JSON.stringify(putError)}
        className="pf-v5-u-mt-lg pf-v5-u-mb-md"
      >
        <span>
          <Button
            variant={ButtonVariant.primary}
            onClick={onSave}
            isDisabled={inProgress}
            className="pf-v5-u-mr-xs"
          >
            {isEdit ? t('Save') : t('Create')}
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

export const CreateCorsRule: React.FC<{}> = () => (
  <NoobaaS3Provider>
    <CreateOrEditCorsForm />
  </NoobaaS3Provider>
);

export const EditCorsRule: React.FC<{}> = () => (
  <NoobaaS3Provider>
    <CreateOrEditCorsForm isEdit />
  </NoobaaS3Provider>
);
