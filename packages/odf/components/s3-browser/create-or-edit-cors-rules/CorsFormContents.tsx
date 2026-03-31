import * as React from 'react';
import { GetBucketCorsCommandOutput } from '@aws-sdk/client-s3';
import { FieldLevelHelp } from '@odf/shared';
import { WILDCARD } from '@odf/shared/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Trans } from 'react-i18next';
import {
  FormGroup,
  TextInput,
  Radio,
  ValidatedOptions,
  Button,
  ButtonVariant,
  Alert,
  AlertVariant,
  Checkbox,
  NumberInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { TrashIcon, PlusCircleIcon } from '@patternfly/react-icons';
import {
  AllowedMethods,
  StateAndDispatchProps,
  RuleActionType,
  RuleAction,
} from './reducer';
import { isInvalidName, isInvalidOrigin, isInvalidMethod } from './validations';
import './create-cors-rules.scss';

const ORIGINS_RADIO_GROUP = 'cors-allowed-origins-radio';
const HEADERS_RADIO_GROUP = 'cors-allowed-headers-radio';

type AddTextInputProps = {
  dispatch: React.Dispatch<RuleAction>;
  actionState: string[];
  actionType:
    | RuleActionType.RULE_ORIGINS
    | RuleActionType.RULE_HEADERS
    | RuleActionType.RULE_EXPOSED_HEADERS;
  placeholder: string;
  addButtonText: string;
};

const AddTextInput: React.FC<AddTextInputProps> = ({
  actionState,
  dispatch,
  actionType,
  placeholder,
  addButtonText,
}) => {
  const onChange = (index: number, value: string) => {
    const newActionState = [...actionState];
    newActionState[index] = value;
    dispatch({ type: actionType, payload: newActionState });
  };

  return (
    <>
      {actionState.map((element, index) => (
        <span
          key={actionType + index}
          className="pf-v6-u-display-flex pf-v6-u-flex-direction-row pf-v6-u-mb-xs"
        >
          <TextInput
            value={element}
            onChange={(_e, value) => onChange(index, value)}
            placeholder={placeholder}
            className="pf-v6-u-mr-sm pf-v6-u-w-50"
          />
          <Button
            icon={<TrashIcon />}
            variant={ButtonVariant.plain}
            onClick={() =>
              dispatch({
                type: actionType,
                payload: actionState.filter((_, i) => i !== index),
              })
            }
          />
        </span>
      ))}
      <Button
        icon={<PlusCircleIcon />}
        variant={ButtonVariant.link}
        onClick={() =>
          dispatch({
            type: actionType,
            payload: [...actionState, ''],
          })
        }
        className="s3-cors-button--margin"
      >
        {addButtonText}
      </Button>
    </>
  );
};

export const CorsFormContents: React.FC<
  StateAndDispatchProps & {
    existingRules: GetBucketCorsCommandOutput;
    isEdit?: boolean;
    editingRuleName?: string;
  }
> = ({ state, dispatch, existingRules, isEdit, editingRuleName }) => {
  const { t } = useCustomTranslation();

  const name = state.name;
  const [invalidName, emptyName, alreadyUsedName, exceedingLengthName] =
    state.triggerInlineValidations
      ? isInvalidName(state, existingRules, isEdit, editingRuleName)
      : [];

  const allowAllOrigins = state.allowAllOrigins;
  const allowedOrigins = state.allowedOrigins;
  const invalidOrigin =
    state.triggerInlineValidations && isInvalidOrigin(state);

  const allowedMethods = state.allowedMethods;
  const invalidMethod =
    state.triggerInlineValidations && isInvalidMethod(state);

  const allowAllHeaders = state.allowAllHeaders;
  const allowedHeaders = state.allowedHeaders;

  const exposedHeaders = state.exposedHeaders;

  const maxAge = state.maxAge;

  return (
    <>
      <FormGroup
        label={t('Rule name')}
        fieldId="name"
        className="pf-v6-u-mb-lg"
      >
        <TextInput
          id="name"
          value={name}
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

      <FormGroup
        label={
          <>
            {t('Allowed origins')}
            <FieldLevelHelp>
              {t(
                'List of domains allowed to access the resources (can include wildcards).'
              )}
            </FieldLevelHelp>
          </>
        }
        fieldId="allowed-origins"
      >
        <span className="pf-v6-u-display-flex pf-v6-u-flex-direction-column">
          <Radio
            label={t('All origins')}
            description={
              <Trans t={t}>
                Allow requests from all domains using a wildcard (*). Use{' '}
                <b>
                  <i>custom origins</i>
                </b>{' '}
                if requests include credentials like cookies or HTTP
                authentication.
              </Trans>
            }
            name={ORIGINS_RADIO_GROUP}
            isChecked={allowAllOrigins}
            onChange={() => {
              dispatch({
                type: RuleActionType.RULE_ORIGINS,
                payload: [WILDCARD],
              });
              dispatch({
                type: RuleActionType.RULE_ALLOW_ALL_ORIGINS,
                payload: true,
              });
            }}
            id="allowed-origins-all"
            className="pf-v6-u-mb-sm"
          />
          <Radio
            label={t('Custom origins')}
            description={t('Allow requests only from specified domains.')}
            name={ORIGINS_RADIO_GROUP}
            isChecked={!allowAllOrigins}
            onChange={() => {
              dispatch({
                type: RuleActionType.RULE_ORIGINS,
                payload: [],
              });
              dispatch({
                type: RuleActionType.RULE_ALLOW_ALL_ORIGINS,
                payload: false,
              });
            }}
            id="allowed-origins-custom"
            className="pf-v6-u-mt-sm"
          />
        </span>
        {invalidOrigin && (
          <Alert
            variant={AlertVariant.danger}
            isInline
            isPlain
            title={t('An origin is required.')}
            className="s3-cors-input--margin s3-cors-validation--font-weight"
          />
        )}
        {!allowAllOrigins && (
          <FormGroup
            label={t('Origin')}
            fieldId="origins"
            className="s3-cors-input--margin"
          >
            <AddTextInput
              actionState={allowedOrigins}
              dispatch={dispatch}
              actionType={RuleActionType.RULE_ORIGINS}
              placeholder={'https://allowed-origin.com'}
              addButtonText={
                allowedOrigins.length > 0
                  ? t('Add another origin')
                  : t('Add origin')
              }
            />
          </FormGroup>
        )}
      </FormGroup>

      <FormGroup
        label={
          <>
            {t('Allowed methods')}
            <FieldLevelHelp>
              {t('HTTP methods that are permitted for cross-origin requests.')}
            </FieldLevelHelp>
          </>
        }
        fieldId="allowed-methods"
        className="pf-v6-u-my-lg"
      >
        {invalidMethod && (
          <Alert
            variant={AlertVariant.danger}
            isInline
            isPlain
            title={t('A method is required.')}
            className="s3-cors-validation--font-weight"
          />
        )}
        <span className="pf-v6-u-display-flex pf-v6-u-flex-direction-row">
          {Object.keys(AllowedMethods).map(
            (allowedMethod: AllowedMethods, index: number) => (
              <Checkbox
                id={allowedMethod + index}
                label={allowedMethod}
                isChecked={allowedMethods.includes(allowedMethod)}
                onChange={(_e, checked) => {
                  if (checked)
                    dispatch({
                      type: RuleActionType.RULE_METHODS,
                      payload: [...allowedMethods, allowedMethod],
                    });
                  else
                    dispatch({
                      type: RuleActionType.RULE_METHODS,
                      payload: allowedMethods.filter(
                        (method) => method !== allowedMethod
                      ),
                    });
                }}
                className="pf-v6-u-mr-md"
              />
            )
          )}
        </span>
      </FormGroup>

      <FormGroup
        label={
          <>
            {t('Allowed headers')}
            <FieldLevelHelp>
              {t('Headers that can be sent by the client in the request.')}
            </FieldLevelHelp>
          </>
        }
        fieldId="allowed-headers"
      >
        <span className="pf-v6-u-display-flex pf-v6-u-flex-direction-column">
          <Radio
            label={t('All headers')}
            description={
              <Trans t={t}>
                Allows all headers using a wildcard (*). Use{' '}
                <b>
                  <i>custom headers</i>
                </b>{' '}
                if requests include credentials like cookies or authentication
                headers.
              </Trans>
            }
            name={HEADERS_RADIO_GROUP}
            isChecked={allowAllHeaders}
            onChange={() => {
              dispatch({
                type: RuleActionType.RULE_HEADERS,
                payload: [WILDCARD],
              });
              dispatch({
                type: RuleActionType.RULE_ALLOW_ALL_HEADERS,
                payload: true,
              });
            }}
            id="allowed-headers-all"
            className="pf-v6-u-mb-sm"
          />
          <Radio
            label={t('Custom headers')}
            description={t('Restrict access to only the headers you specify.')}
            name={HEADERS_RADIO_GROUP}
            isChecked={!allowAllHeaders}
            onChange={() => {
              dispatch({
                type: RuleActionType.RULE_HEADERS,
                payload: [],
              });
              dispatch({
                type: RuleActionType.RULE_ALLOW_ALL_HEADERS,
                payload: false,
              });
            }}
            id="allowed-headers-custom"
            className="pf-v6-u-mt-sm"
          />
        </span>
        {!allowAllHeaders && (
          <FormGroup
            label={t('Header')}
            fieldId="headers"
            className="s3-cors-input--margin"
          >
            <AddTextInput
              actionState={allowedHeaders}
              dispatch={dispatch}
              actionType={RuleActionType.RULE_HEADERS}
              placeholder={t('Enter a header')}
              addButtonText={
                allowedHeaders.length > 0
                  ? t('Add another header')
                  : t('Add header')
              }
            />
          </FormGroup>
        )}
      </FormGroup>

      <FormGroup
        label={
          <>
            {t('Exposed headers')}
            <FieldLevelHelp>
              {t('Headers that should be exposed to the browser.')}
            </FieldLevelHelp>
          </>
        }
        fieldId="exposed-headers"
        className="pf-v6-u-my-lg"
      >
        <AddTextInput
          actionState={exposedHeaders}
          dispatch={dispatch}
          actionType={RuleActionType.RULE_EXPOSED_HEADERS}
          placeholder={t('Enter an exposed header')}
          addButtonText={
            exposedHeaders.length > 0
              ? t('Add another header')
              : t('Add header')
          }
        />
      </FormGroup>

      <FormGroup
        label={
          <>
            {t('Max age for preflight requests (in seconds)')}
            <FieldLevelHelp>
              {t(
                'Time in seconds for how long the browser should cache the CORS preflight response.'
              )}
            </FieldLevelHelp>
          </>
        }
        fieldId="max-preflight"
      >
        <NumberInput
          value={maxAge}
          onMinus={() =>
            dispatch({
              type: RuleActionType.RULE_MAX_AGE,
              payload: maxAge - 1 || 0,
            })
          }
          onPlus={() =>
            dispatch({
              type: RuleActionType.RULE_MAX_AGE,
              payload: maxAge + 1 || 0,
            })
          }
          onChange={(event) =>
            dispatch({
              type: RuleActionType.RULE_MAX_AGE,
              payload: +(event?.target as HTMLInputElement)?.value || 0,
            })
          }
        />
      </FormGroup>
    </>
  );
};
