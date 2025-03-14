import * as React from 'react';
import { CORSRule, GetBucketCorsCommandOutput } from '@aws-sdk/client-s3';
import { deepSortObject } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { murmur3 } from 'murmurhash-js';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { RULE_NAME, RULE_HASH } from '../../../constants';
import {
  ruleInitialState,
  RuleActionType,
  RuleState,
  RuleAction,
} from './reducer';

type UseEditCorsRule = ({
  isEdit,
  existingRules,
  dispatch,
}: {
  isEdit: boolean;
  existingRules: GetBucketCorsCommandOutput;
  dispatch: React.Dispatch<RuleAction>;
}) => [string, string];

const convertCorsRuleToRuleState = (_rule: CORSRule): RuleState => {
  let ruleState: RuleState = _.cloneDeep(ruleInitialState);

  return ruleState;
};

const setEditRuleState = (
  ruleName: string,
  ruleHash: string,
  existingRules: GetBucketCorsCommandOutput,
  dispatch: React.Dispatch<RuleAction>
) => {
  let corsRule = {} as CORSRule;
  if (!!ruleName) {
    corsRule = existingRules?.CORSRules?.find((rule) => rule.ID === ruleName);
  } else if (!!ruleHash) {
    // fallback if rule name (ID) is missing
    corsRule = existingRules?.CORSRules?.find(
      (rule) => `${murmur3(JSON.stringify(deepSortObject(rule)))}` === ruleHash
    );
  }

  const ruleState = convertCorsRuleToRuleState(corsRule);
  dispatch({
    type: RuleActionType.RULE,
    payload: ruleState,
  });
};

export const useEditCorsRule: UseEditCorsRule = ({
  isEdit,
  existingRules,
  dispatch,
}) => {
  const [searchParams] = useSearchParams();
  const ruleName = searchParams.get(RULE_NAME);
  const ruleHash = searchParams.get(RULE_HASH);
  const editRef = React.useRef(true);
  React.useEffect(() => {
    if (isEdit && editRef.current && !!existingRules?.CORSRules?.length) {
      editRef.current = false;
      setEditRuleState(ruleName, ruleHash, existingRules, dispatch);
    }
  }, [isEdit, ruleName, ruleHash, existingRules, dispatch]);

  return [ruleName, ruleHash];
};
