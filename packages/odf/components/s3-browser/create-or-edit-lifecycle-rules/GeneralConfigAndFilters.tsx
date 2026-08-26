import * as React from 'react';
import {
  GetBucketLifecycleConfigurationCommandOutput,
  Tag,
} from '@aws-sdk/client-s3';
import StaticDropdown from '@odf/shared/dropdown/StaticDropdown';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { dehumanize } from '@odf/shared/utils';
import {
  ContentVariants,
  Content,
  Divider,
  FormGroup,
  TextInput,
  Radio,
  Alert,
  AlertVariant,
  ValidatedOptions,
  Button,
  ButtonVariant,
  Checkbox,
  NumberInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { TrashIcon, PlusCircleIcon } from '@patternfly/react-icons';
import {
  StateAndDispatchProps,
  RuleState,
  RuleActionType,
  RuleScope,
  ObjectSize,
  SizeUnit,
  FuncType,
} from './reducer';
import {
  isInvalidName,
  areInvalidFilters,
  isInvalidObjectTag,
  isInvalidObjectSize,
} from './validations';
import './create-lifecycle-rules.scss';

const RADIO_GROUP_NAME = 'lifecycle-rule-scope-radio';
const MAX_OBJ_SIZE = 'maxObjectSize';
const MIN_OBJ_SIZE = 'minObjectSize';
const UNITS_TYPE = 'binaryBytes';

type TagField = keyof Tag;
type SizeField = keyof Pick<
  RuleState['conditionalFilters'],
  typeof MAX_OBJ_SIZE | typeof MIN_OBJ_SIZE
>;
type SizeAction =
  | RuleActionType.RULE_MAX_SIZE_FILTER
  | RuleActionType.RULE_MIN_SIZE_FILTER;

const getSizeObjAndActionType = (
  sizeField: SizeField,
  maxObjectSize: ObjectSize,
  minObjectSize: ObjectSize
): [ObjectSize, SizeAction] => [
  sizeField === MAX_OBJ_SIZE ? maxObjectSize : minObjectSize,
  sizeField === MAX_OBJ_SIZE
    ? RuleActionType.RULE_MAX_SIZE_FILTER
    : RuleActionType.RULE_MIN_SIZE_FILTER,
];

const ObjectSizeFilter: React.FC<StateAndDispatchProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const minObjectSize = state.conditionalFilters.minObjectSize;
  const maxObjectSize = state.conditionalFilters.maxObjectSize;
  const onNumberInputAction = (
    sizeField: SizeField,
    funcType: FuncType,
    event?: React.FormEvent<HTMLInputElement>
  ) => {
    const [objectSize, objectSizeAction] = getSizeObjAndActionType(
      sizeField,
      maxObjectSize,
      minObjectSize
    );
    let newSize: number;
    switch (funcType) {
      case FuncType.ON_CHANGE: {
        newSize = Math.max(+(event?.target as HTMLInputElement)?.value || 0, 0);
        break;
      }
      case FuncType.ON_MINUS: {
        newSize = Math.max(objectSize.size - 1, 0);
        break;
      }
      case FuncType.ON_PLUS: {
        newSize = objectSize.size + 1;
        break;
      }
    }
    const newSizeInB: number = Math.round(
      dehumanize(`${newSize}${objectSize.unit}`, UNITS_TYPE).value
    );
    dispatch({
      type: objectSizeAction,
      payload: {
        ...objectSize,
        size: newSize,
        sizeInB: newSizeInB,
      },
    });
  };
  const onUnitDropdownChange = (sizeField: SizeField, newUnit: SizeUnit) => {
    const [objectSize, objectSizeAction] = getSizeObjAndActionType(
      sizeField,
      maxObjectSize,
      minObjectSize
    );
    const newSizeInB: number = Math.round(
      dehumanize(`${objectSize.size}${newUnit}`, UNITS_TYPE).value
    );
    dispatch({
      type: objectSizeAction,
      payload: {
        ...objectSize,
        unit: newUnit,
        sizeInB: newSizeInB,
      },
    });
  };

  const [, invalidMinSize, invalidMaxSize, invalidSize] =
    state.triggerInlineValidations ? isInvalidObjectSize(state) : [];

  return (
    <>
      <Checkbox
        id="min-object-size"
        label={t('Specify minimum object size')}
        isChecked={minObjectSize.isChecked}
        onChange={(_e, checked) =>
          dispatch({
            type: RuleActionType.RULE_MIN_SIZE_FILTER,
            payload: { ...minObjectSize, isChecked: checked },
          })
        }
        body={
          minObjectSize.isChecked ? (
            <>
              <span>
                <NumberInput
                  value={minObjectSize.size}
                  min={0}
                  onMinus={() =>
                    onNumberInputAction(MIN_OBJ_SIZE, FuncType.ON_MINUS)
                  }
                  onPlus={() =>
                    onNumberInputAction(MIN_OBJ_SIZE, FuncType.ON_PLUS)
                  }
                  onChange={(e) =>
                    onNumberInputAction(MIN_OBJ_SIZE, FuncType.ON_CHANGE, e)
                  }
                  className="pf-v6-u-mr-sm"
                  validated={
                    invalidMinSize
                      ? ValidatedOptions.error
                      : ValidatedOptions.default
                  }
                />
                <StaticDropdown
                  defaultSelection={minObjectSize.unit}
                  dropdownItems={SizeUnit}
                  onSelect={(newUnit: SizeUnit) =>
                    onUnitDropdownChange(MIN_OBJ_SIZE, newUnit)
                  }
                  className="pf-v6-u-mr-sm"
                />
                {t('{{sizeInB}} Bytes', { sizeInB: minObjectSize.sizeInB })}
              </span>
              {invalidMinSize && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant={ValidatedOptions.error}>
                      {t('Must be a positive number 0 Byte or higher.')}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
            </>
          ) : null
        }
        className="pf-v6-u-mb-sm"
      />
      <Checkbox
        id="max-object-size"
        label={t('Specify maximum object size')}
        isChecked={maxObjectSize.isChecked}
        onChange={(_e, checked) =>
          dispatch({
            type: RuleActionType.RULE_MAX_SIZE_FILTER,
            payload: { ...maxObjectSize, isChecked: checked },
          })
        }
        body={
          maxObjectSize.isChecked ? (
            <>
              <span>
                <NumberInput
                  value={maxObjectSize.size}
                  min={0}
                  onMinus={() =>
                    onNumberInputAction(MAX_OBJ_SIZE, FuncType.ON_MINUS)
                  }
                  onPlus={() =>
                    onNumberInputAction(MAX_OBJ_SIZE, FuncType.ON_PLUS)
                  }
                  onChange={(e) =>
                    onNumberInputAction(MAX_OBJ_SIZE, FuncType.ON_CHANGE, e)
                  }
                  className="pf-v6-u-mr-sm"
                  validated={
                    invalidMaxSize || invalidSize
                      ? ValidatedOptions.error
                      : ValidatedOptions.default
                  }
                />
                <StaticDropdown
                  defaultSelection={maxObjectSize.unit}
                  dropdownItems={SizeUnit}
                  onSelect={(newUnit: SizeUnit) =>
                    onUnitDropdownChange(MAX_OBJ_SIZE, newUnit)
                  }
                  className="pf-v6-u-mr-sm"
                />
                {t('{{sizeInB}} Bytes', { sizeInB: maxObjectSize.sizeInB })}
              </span>
              {(invalidMaxSize || invalidSize) && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant={ValidatedOptions.error}>
                      {invalidMaxSize &&
                        t('Must be a positive number 1 Byte or higher.')}
                      {invalidSize &&
                        t(
                          'The maximum object size must be larger than the minimum object size.'
                        )}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
            </>
          ) : null
        }
        className="pf-v6-u-mt-sm"
      />
    </>
  );
};

const ObjectTagsFilter: React.FC<StateAndDispatchProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const objectTags = state.conditionalFilters.objectTags;
  const onTagChange = (index: number, field: TagField, value: string) => {
    const newObjectTags = [...objectTags];
    newObjectTags[index][field] = value;
    dispatch({ type: RuleActionType.RULE_TAGS_FILTER, payload: newObjectTags });
  };

  return (
    <>
      {objectTags.map((tag, index) => {
        const [invalidTag, emptyKey, alreadyUsedKey] =
          state.triggerInlineValidations
            ? isInvalidObjectTag(state, tag, index)
            : [];

        return (
          <>
            <span
              key={index}
              className="pf-v6-u-display-flex pf-v6-u-flex-direction-row pf-v6-u-mb-xs"
            >
              <TextInput
                id="object-tags-key"
                value={tag.Key}
                onChange={(_e, value) => onTagChange(index, 'Key', value)}
                placeholder={t('Key')}
                className="pf-v6-u-mr-sm pf-v6-u-w-25"
                validated={
                  invalidTag ? ValidatedOptions.error : ValidatedOptions.default
                }
              />
              <TextInput
                id="object-tags-value"
                value={tag.Value}
                onChange={(_e, value) => onTagChange(index, 'Value', value)}
                placeholder={t('Value (Optional)')}
                className="pf-v6-u-mr-sm pf-v6-u-w-25"
              />
              <Button
                icon={<TrashIcon />}
                variant={ButtonVariant.plain}
                onClick={() =>
                  dispatch({
                    type: RuleActionType.RULE_TAGS_FILTER,
                    payload: objectTags.filter((_, i) => i !== index),
                  })
                }
              />
            </span>
            {invalidTag && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant={ValidatedOptions.error}>
                    {emptyKey && t('A tag key is required.')}
                    {alreadyUsedKey && t('Keys must be unique.')}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </>
        );
      })}
      <Button
        icon={<PlusCircleIcon />}
        variant={ButtonVariant.link}
        className="s3-lifecycle--margin"
        onClick={() =>
          dispatch({
            type: RuleActionType.RULE_TAGS_FILTER,
            payload: [...objectTags, { Key: '', Value: '' }],
          })
        }
      >
        {t('Add object tag')}
      </Button>
    </>
  );
};

const ConditionalFilters: React.FC<StateAndDispatchProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const invalidFilters =
    state.triggerInlineValidations && areInvalidFilters(state);

  return (
    <>
      <Content className="pf-v6-u-mb-lg">
        <Content component={ContentVariants.h2}>
          {t('Conditional filters')}
        </Content>
        <Content component={ContentVariants.small}>
          {t(
            'Define specific criteria for selecting objects that the rules will apply to. Object tags or object size filters do not apply to incomplete multipart uploads or expired object delete markers.'
          )}
        </Content>
      </Content>

      <FormGroup label={t('Prefix')} fieldId="prefix" className="pf-v6-u-mb-lg">
        <TextInput
          id="prefix"
          value={state.conditionalFilters.prefix}
          onChange={(_e, value) =>
            dispatch({
              type: RuleActionType.RULE_PREFIX_FILTER,
              payload: value,
            })
          }
          placeholder={t('Enter prefix')}
          className="pf-v6-u-w-50"
          validated={
            invalidFilters ? ValidatedOptions.error : ValidatedOptions.default
          }
        />
        {invalidFilters ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={ValidatedOptions.error}>
                {t('You must specify a prefix or another filter.')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : (
          <Content>
            <Content component={ContentVariants.small}>
              {t('A prefix filters bucket objects by their keys.')}
            </Content>
          </Content>
        )}
      </FormGroup>

      <FormGroup
        label={t('Object tags')}
        fieldId="object-tags"
        className="pf-v6-u-mb-lg"
      >
        <Content className="pf-v6-u-mb-sm">
          <Content component={ContentVariants.small}>
            {t('An object tag is a label that is assigned to an S3 object.')}
          </Content>
        </Content>
        <ObjectTagsFilter state={state} dispatch={dispatch} />
        {invalidFilters && (
          <Alert
            variant={AlertVariant.danger}
            isInline
            isPlain
            title={t('You must specify an object tag or another filter.')}
            className="s3-lifecycle-validation--font-weight"
          />
        )}
      </FormGroup>

      <FormGroup label={t('Object size')} fieldId="object-size">
        <Content className="pf-v6-u-mb-sm">
          <Content component={ContentVariants.small}>
            {t('Set criteria for filtering objects based on their size.')}
          </Content>
        </Content>
        <ObjectSizeFilter state={state} dispatch={dispatch} />
        {invalidFilters && (
          <Alert
            variant={AlertVariant.danger}
            isInline
            isPlain
            title={t('You must specify an object size or another filter.')}
            className="s3-lifecycle-validation--font-weight"
          />
        )}
      </FormGroup>
      <Divider className="pf-v6-u-my-md" />
    </>
  );
};

export const GeneralConfigAndFilters: React.FC<
  StateAndDispatchProps & {
    existingRules: GetBucketLifecycleConfigurationCommandOutput;
    isEdit?: boolean;
    editingRuleName?: string;
  }
> = ({ state, dispatch, existingRules, isEdit, editingRuleName }) => {
  const { t } = useCustomTranslation();

  const [invalidName, emptyName, alreadyUsedName, exceedingLengthName] =
    state.triggerInlineValidations
      ? isInvalidName(state, existingRules, isEdit, editingRuleName)
      : [];

  return (
    <>
      <Content className="pf-v6-u-mb-lg">
        <Content component={ContentVariants.h2}>
          {t('General configuration')}
        </Content>
      </Content>

      <FormGroup
        label={t('Lifecycle rule name')}
        fieldId="name"
        className="pf-v6-u-mb-lg"
      >
        <TextInput
          id="name"
          value={state.name}
          onChange={(_e, value) =>
            dispatch({ type: RuleActionType.RULE_NAME, payload: value })
          }
          placeholder={t('Enter a valid rule name')}
          className="pf-v6-u-w-50"
          validated={
            invalidName ? ValidatedOptions.error : ValidatedOptions.default
          }
        />
        {invalidName && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={ValidatedOptions.error}>
                {emptyName && t('A rule name is required.')}
                {alreadyUsedName &&
                  t(
                    'A rule with this name already exists. Type a different name.'
                  )}
                {exceedingLengthName && t('No more than 255 characters')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>

      <FormGroup label={t('Rule scope')} fieldId="scope">
        <span className="pf-v6-u-display-flex pf-v6-u-flex-direction-row">
          <Radio
            label={t('Targeted')}
            description={t(
              'Applies to a specific subset of objects within a bucket, based on defined criteria. Allows for more granular control over which objects the rule targets.'
            )}
            name={RADIO_GROUP_NAME}
            value={RuleScope.TARGETED}
            isChecked={state.scope === RuleScope.TARGETED}
            onChange={(event) =>
              dispatch({
                type: RuleActionType.RULE_SCOPE,
                payload: (event.target as HTMLInputElement).value as RuleScope,
              })
            }
            id={`scope-${RuleScope.TARGETED}`}
            className="pf-v6-u-mr-md pf-v6-u-w-50"
          />
          <Radio
            label={t('Global (Bucket-wide)')}
            description={t(
              'Applies to all objects in the bucket without any filters. Uses the same lifecycle action for every object in the bucket.'
            )}
            name={RADIO_GROUP_NAME}
            value={RuleScope.GLOBAL}
            isChecked={state.scope === RuleScope.GLOBAL}
            onChange={(event) =>
              dispatch({
                type: RuleActionType.RULE_SCOPE,
                payload: (event.target as HTMLInputElement).value as RuleScope,
              })
            }
            id={`scope-${RuleScope.GLOBAL}`}
            className="pf-v6-u-ml-md pf-v6-u-w-50"
          />
        </span>
      </FormGroup>

      {state.scope === RuleScope.GLOBAL && (
        <Alert
          title={t('Global rule scope selected')}
          variant={AlertVariant.info}
          className="pf-v6-u-mt-md"
          isInline
        >
          {t(
            'You have selected to apply this lifecycle rule to all objects in the bucket. This may impact objects that do not require the specified expirations. If your bucket contains a mix of object types, consider using filters like prefixes or tags to target specific objects.'
          )}
        </Alert>
      )}
      <Divider className="pf-v6-u-my-md" />
      {state.scope === RuleScope.TARGETED && (
        <ConditionalFilters state={state} dispatch={dispatch} />
      )}
    </>
  );
};
