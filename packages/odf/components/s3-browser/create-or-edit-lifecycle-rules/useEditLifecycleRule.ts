import * as React from 'react';
import {
  LifecycleRule,
  GetBucketLifecycleConfigurationCommandOutput,
  Tag,
} from '@aws-sdk/client-s3';
import { deepSortObject, humanizeBinaryBytes } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { murmur3 } from 'murmurhash-js';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { RULE_NAME, RULE_HASH } from '../../../constants';
import { isRuleScopeGlobal } from '../../../utils';
import {
  ruleInitialState,
  RuleActionType,
  RuleState,
  RuleScope,
  RuleAction,
  SizeUnit,
} from './reducer';

type UseEditLifecycleRule = ({
  isEdit,
  existingRules,
  dispatch,
}: {
  isEdit: boolean;
  existingRules: GetBucketLifecycleConfigurationCommandOutput;
  dispatch: React.Dispatch<RuleAction>;
}) => [string, string];

const convertLifecycleRuleToRuleState = (rule: LifecycleRule): RuleState => {
  let ruleState: RuleState = _.cloneDeep(ruleInitialState);

  if (_.isEmpty(rule)) return ruleState;

  // name and scope
  ruleState.name = rule.ID || '';
  ruleState.scope = isRuleScopeGlobal(rule)
    ? RuleScope.GLOBAL
    : RuleScope.TARGETED;

  // filters
  let prefix = '';
  let sizeGreater: number;
  let sizeLess: number;

  const tags: Tag[] = rule.Filter?.Tag
    ? [rule.Filter.Tag]
    : rule.Filter?.And
      ? rule.Filter.And?.Tags || []
      : [];

  if (rule.Filter) {
    if (rule.Filter?.And) {
      prefix = rule.Filter.And?.Prefix || '';
      sizeGreater = rule.Filter.And?.ObjectSizeGreaterThan;
      sizeLess = rule.Filter.And?.ObjectSizeLessThan;
    } else {
      prefix = rule.Filter?.Prefix || '';
      sizeGreater = rule.Filter?.ObjectSizeGreaterThan;
      sizeLess = rule.Filter?.ObjectSizeLessThan;
    }
  }
  ruleState.conditionalFilters.prefix = prefix;
  ruleState.conditionalFilters.objectTags = tags;

  if (!!sizeGreater && typeof sizeGreater === 'number') {
    ruleState.conditionalFilters.minObjectSize.isChecked = true;
    ruleState.conditionalFilters.minObjectSize.sizeInB = sizeGreater;
    ruleState.conditionalFilters.minObjectSize.unit = SizeUnit.KiB;
    ruleState.conditionalFilters.minObjectSize.size = humanizeBinaryBytes(
      sizeGreater,
      SizeUnit.B,
      SizeUnit.KiB
    ).value;
  }
  if (!!sizeLess && typeof sizeLess === 'number') {
    ruleState.conditionalFilters.maxObjectSize.isChecked = true;
    ruleState.conditionalFilters.maxObjectSize.sizeInB = sizeLess;
    ruleState.conditionalFilters.maxObjectSize.unit = SizeUnit.KiB;
    ruleState.conditionalFilters.maxObjectSize.size = humanizeBinaryBytes(
      sizeLess,
      SizeUnit.B,
      SizeUnit.KiB
    ).value;
  }

  // actions
  if (rule.Expiration) {
    if (!!rule.Expiration?.Days && typeof rule.Expiration.Days === 'number') {
      ruleState.actions.deleteCurrent.isChecked = true;
      ruleState.actions.deleteCurrent.days = rule.Expiration.Days;
    }
    if (rule.Expiration?.ExpiredObjectDeleteMarker === true) {
      ruleState.actions.deleteExpiredMarkers = true;
    }
  }
  if (rule.NoncurrentVersionExpiration) {
    if (
      !!rule.NoncurrentVersionExpiration?.NoncurrentDays &&
      typeof rule.NoncurrentVersionExpiration.NoncurrentDays === 'number'
    ) {
      ruleState.actions.deleteNonCurrent.isChecked = true;
      ruleState.actions.deleteNonCurrent.days =
        rule.NoncurrentVersionExpiration.NoncurrentDays;
      ruleState.actions.deleteNonCurrent.retention =
        rule.NoncurrentVersionExpiration?.NewerNoncurrentVersions || 0;
    }
  }
  if (rule.AbortIncompleteMultipartUpload) {
    if (
      !!rule.AbortIncompleteMultipartUpload?.DaysAfterInitiation &&
      typeof rule.AbortIncompleteMultipartUpload.DaysAfterInitiation ===
        'number'
    ) {
      ruleState.actions.deleteIncompleteMultiparts.isChecked = true;
      ruleState.actions.deleteIncompleteMultiparts.days =
        rule.AbortIncompleteMultipartUpload.DaysAfterInitiation;
    }
  }

  return ruleState;
};

const setEditRuleState = (
  ruleName: string,
  ruleHash: string,
  existingRules: GetBucketLifecycleConfigurationCommandOutput,
  dispatch: React.Dispatch<RuleAction>
) => {
  let lifecycleRule = {} as LifecycleRule;
  if (!!ruleName) {
    lifecycleRule = existingRules?.Rules?.find((rule) => rule.ID === ruleName);
  } else if (!!ruleHash) {
    // fallback if rule name (ID) is missing
    lifecycleRule = existingRules?.Rules?.find(
      (rule) => `${murmur3(JSON.stringify(deepSortObject(rule)))}` === ruleHash
    );
  }

  const ruleState = convertLifecycleRuleToRuleState(lifecycleRule);
  dispatch({
    type: RuleActionType.RULE,
    payload: ruleState,
  });
};

export const useEditLifecycleRule: UseEditLifecycleRule = ({
  isEdit,
  existingRules,
  dispatch,
}) => {
  const [searchParams] = useSearchParams();
  const ruleName = searchParams.get(RULE_NAME);
  const ruleHash = searchParams.get(RULE_HASH);
  const editRef = React.useRef(true);
  React.useEffect(() => {
    if (isEdit && editRef.current && !!existingRules?.Rules?.length) {
      editRef.current = false;
      setEditRuleState(ruleName, ruleHash, existingRules, dispatch);
    }
  }, [isEdit, ruleName, ruleHash, existingRules, dispatch]);

  return [ruleName, ruleHash];
};
