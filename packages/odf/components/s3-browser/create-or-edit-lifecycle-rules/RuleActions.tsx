import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Trans } from 'react-i18next';
import {
  ContentVariants,
  Content,
  Accordion,
  AccordionItem,
  AccordionContent,
  AccordionToggle,
  Checkbox,
  TextInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
  NumberInput,
  Label,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { StateAndDispatchProps, RuleActionType, FuncType } from './reducer';
import {
  isInvalidActionsCount,
  isInvalidDeleteCurrent,
  isInvalidDeleteNonCurrent,
  isInvalidDeleteMultiparts,
} from './validations';
import './create-lifecycle-rules.scss';

enum Actions {
  CURRENT_OBJECTS = 'CURRENT_OBJECTS',
  NONCURRENT_OBJECTS = 'NONCURRENT_OBJECTS',
  INCOMPLETE_UPLOADS = 'INCOMPLETE_UPLOADS',
  EXPIRED_MARKERS = 'EXPIRED_MARKERS',
}

const ExpiredDeleteMarkers: React.FC<StateAndDispatchProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const deleteExpiredMarkers = state.actions.deleteExpiredMarkers;
  const deleteCurrent = state.actions.deleteCurrent;

  return (
    <div className="pf-v6-u-ml-xl">
      <Checkbox
        id="expired-delete-marker"
        label={t('Delete expired object delete markers')}
        className="pf-v6-u-mb-md"
        isChecked={deleteExpiredMarkers}
        isDisabled={deleteCurrent.isChecked}
        onChange={(_e, checked) =>
          dispatch({
            type: RuleActionType.RULE_DELETE_MARKERS_ACTION,
            payload: checked,
          })
        }
      />
      {deleteCurrent.isChecked ? (
        <Alert
          variant={AlertVariant.info}
          isInline
          isPlain
          title={t(
            'Delete expired object delete markers cannot be enabled when delete object (i.e expiry current versions) is selected.'
          )}
        />
      ) : (
        <>
          <b>{t('Note:')}</b>
          <br />
          {t(
            'Above object tags and object size filters are not applicable for this rule action. Expired object delete markers will be removed from the bucket regardless of any filters you have configured.'
          )}
        </>
      )}
    </div>
  );
};

const IncompleteMultipartUploads: React.FC<StateAndDispatchProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const deleteIncompleteMultiparts = state.actions.deleteIncompleteMultiparts;

  const invalidDeleteMultiparts =
    state.triggerInlineValidations && isInvalidDeleteMultiparts(state);

  return (
    <div className="pf-v6-u-ml-xl">
      <Checkbox
        id="incomplete-multiparts-delete"
        label={t('Delete incomplete multipart uploads')}
        className="pf-v6-u-mb-md"
        isChecked={deleteIncompleteMultiparts.isChecked}
        onChange={(_e, checked) =>
          dispatch({
            type: RuleActionType.RULE_DELETE_MULTIPARTS_ACTION,
            payload: { ...deleteIncompleteMultiparts, isChecked: checked },
          })
        }
        body={
          deleteIncompleteMultiparts.isChecked ? (
            <div className="pf-v6-u-w-25">
              <TextInput
                id="incomplete-multiparts-delete-days"
                value={deleteIncompleteMultiparts.days}
                onChange={(_e, value) =>
                  dispatch({
                    type: RuleActionType.RULE_DELETE_MULTIPARTS_ACTION,
                    payload: {
                      ...deleteIncompleteMultiparts,
                      days: Math.round(+value || 0),
                    },
                  })
                }
                placeholder={t('Enter number of days')}
                type="number"
                validated={
                  invalidDeleteMultiparts
                    ? ValidatedOptions.error
                    : ValidatedOptions.default
                }
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem
                    variant={
                      invalidDeleteMultiparts
                        ? ValidatedOptions.error
                        : ValidatedOptions.default
                    }
                  >
                    {invalidDeleteMultiparts
                      ? t('Must be an integer greater than 0.')
                      : t('Period of time (in days).')}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </div>
          ) : null
        }
      />
      <b>{t('Note:')}</b>
      <br />
      {t(
        'Above object tags and object size filters are not applicable for this rule action. Incomplete multipart uploads will be removed from the bucket regardless of any filters you have configured.'
      )}
    </div>
  );
};

const NonCurrentObjects: React.FC<StateAndDispatchProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const deleteNonCurrent = state.actions.deleteNonCurrent;
  const onNumberInputAction = (
    funcType: FuncType,
    event?: React.FormEvent<HTMLInputElement>
  ) => {
    let newRetention: number;
    switch (funcType) {
      case FuncType.ON_CHANGE: {
        newRetention = Math.max(
          Math.min(
            Math.round(+(event?.target as HTMLInputElement)?.value) || 0,
            100
          ),
          0
        );
        break;
      }
      case FuncType.ON_MINUS: {
        newRetention = Math.max(deleteNonCurrent.retention - 1, 0);
        break;
      }
      case FuncType.ON_PLUS: {
        newRetention = Math.min(deleteNonCurrent.retention + 1, 100);
        break;
      }
    }
    dispatch({
      type: RuleActionType.RULE_DELETE_NON_CURRENT_ACTION,
      payload: {
        ...deleteNonCurrent,
        retention: newRetention,
      },
    });
  };

  const invalidDeleteNonCurrent =
    state.triggerInlineValidations && isInvalidDeleteNonCurrent(state);

  return (
    <Checkbox
      id="noncurrent-object-delete"
      label={t('Delete noncurrent versions')}
      description={t(
        'Delete older versions of objects after they become noncurrent (e.g., a new version overwrites them).'
      )}
      className="pf-v6-u-ml-xl"
      isChecked={deleteNonCurrent.isChecked}
      onChange={(_e, checked) =>
        dispatch({
          type: RuleActionType.RULE_DELETE_NON_CURRENT_ACTION,
          payload: { ...deleteNonCurrent, isChecked: checked },
        })
      }
      body={
        deleteNonCurrent.isChecked ? (
          <>
            <div className="pf-v6-u-w-25">
              <TextInput
                id="noncurrent-object-delete-days"
                value={deleteNonCurrent.days}
                onChange={(_e, value) =>
                  dispatch({
                    type: RuleActionType.RULE_DELETE_NON_CURRENT_ACTION,
                    payload: {
                      ...deleteNonCurrent,
                      days: Math.round(+value || 0),
                    },
                  })
                }
                placeholder={t('Enter number of days')}
                type="number"
                validated={
                  invalidDeleteNonCurrent
                    ? ValidatedOptions.error
                    : ValidatedOptions.default
                }
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem
                    variant={
                      invalidDeleteNonCurrent
                        ? ValidatedOptions.error
                        : ValidatedOptions.default
                    }
                  >
                    {invalidDeleteNonCurrent
                      ? t('Must be an integer greater than 0.')
                      : t(
                          'Period of time (in days) after which a noncurrent versions of object would be deleted since turning noncurrent.'
                        )}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </div>

            <Content className="pf-v6-u-mt-lg">
              <Content component={ContentVariants.p}>
                {t('Preserve object version history (Optional)')}
              </Content>
              <Content
                component={ContentVariants.small}
                className="s3-lifecycle-action--margin"
              >
                {t(
                  'Keep up to 100 noncurrent versions of objects for version management and rollback. Excess versions will be automatically deleted.'
                )}
              </Content>
            </Content>
            <NumberInput
              value={deleteNonCurrent.retention}
              min={0}
              max={100}
              onMinus={() => onNumberInputAction(FuncType.ON_MINUS)}
              onPlus={() => onNumberInputAction(FuncType.ON_PLUS)}
              onChange={(e) => onNumberInputAction(FuncType.ON_CHANGE, e)}
              className="pf-v6-u-mt-md"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t('Number of noncurrent versions of object.')}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </>
        ) : null
      }
    />
  );
};

const CurrentObjects: React.FC<StateAndDispatchProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const deleteCurrent = state.actions.deleteCurrent;

  const invalidDeleteCurrent =
    state.triggerInlineValidations && isInvalidDeleteCurrent(state);

  return (
    <Checkbox
      id="current-object-delete"
      label={t('Delete object (i.e., expiry current versions)')}
      description={t(
        'When deleting for versioned buckets a delete marker is added and the current version of the object is retained as noncurrent version, for non-versioned buckets object deletion is permanent.'
      )}
      className="pf-v6-u-ml-xl"
      isChecked={deleteCurrent.isChecked}
      onChange={(_e, checked) => {
        dispatch({
          type: RuleActionType.RULE_DELETE_CURRENT_ACTION,
          payload: { ...deleteCurrent, isChecked: checked },
        });
        dispatch({
          type: RuleActionType.RULE_DELETE_MARKERS_ACTION,
          payload: false,
        });
      }}
      body={
        deleteCurrent.isChecked ? (
          <div className="pf-v6-u-w-25">
            <TextInput
              id="current-object-delete-days"
              value={deleteCurrent.days}
              onChange={(_e, value) =>
                dispatch({
                  type: RuleActionType.RULE_DELETE_CURRENT_ACTION,
                  payload: { ...deleteCurrent, days: Math.round(+value || 0) },
                })
              }
              placeholder={t('Enter number of days')}
              type="number"
              validated={
                invalidDeleteCurrent
                  ? ValidatedOptions.error
                  : ValidatedOptions.default
              }
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem
                  variant={
                    invalidDeleteCurrent
                      ? ValidatedOptions.error
                      : ValidatedOptions.default
                  }
                >
                  {invalidDeleteCurrent
                    ? t('Must be an integer greater than 0.')
                    : t(
                        'Period of time (in days) after which an object would be deleted since its creation.'
                      )}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </div>
        ) : null
      }
    />
  );
};

export const RuleActions: React.FC<StateAndDispatchProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const [expanded, setExpanded] = React.useState<Actions>(null);

  const onToggle = (id: Actions) => {
    if (id === expanded) {
      setExpanded(null);
    } else {
      setExpanded(id);
    }
  };

  const validate = state.triggerInlineValidations;
  const [invalidActionsCount, actionsCount] = isInvalidActionsCount(state);
  const invalidDeleteCurrent = validate && isInvalidDeleteCurrent(state);
  const invalidDeleteNonCurrent = validate && isInvalidDeleteNonCurrent(state);
  const invalidDeleteMultiparts = validate && isInvalidDeleteMultiparts(state);

  return (
    <>
      <Content>
        <Content component={ContentVariants.h2}>
          {t('Lifecycle rule actions')}
        </Content>
        <Content component={ContentVariants.small}>
          {t(
            'Define what happens to objects in an S3 bucket during their lifecycle.'
          )}
        </Content>
        <Content component={ContentVariants.small} className="pf-v6-u-my-sm">
          <Trans t={t} values={{ actionsCount }}>
            You have defined{' '}
            <strong>{{ actionsCount }} lifecycle rules.</strong>
          </Trans>
        </Content>
      </Content>
      {validate && invalidActionsCount && (
        <Alert
          variant={AlertVariant.danger}
          isInline
          isPlain
          title={t('At least one action needs to be defined for the rule.')}
          className="s3-lifecycle-validation--font-weight"
        />
      )}

      <Accordion togglePosition="start" className="s3-lifecycle--margin">
        <AccordionItem isExpanded={expanded === Actions.CURRENT_OBJECTS}>
          <AccordionToggle
            onClick={() => {
              onToggle(Actions.CURRENT_OBJECTS);
            }}
            id={Actions.CURRENT_OBJECTS}
          >
            <Content
              component={ContentVariants.h3}
              className="pf-v6-u-text-align-left"
            >
              <span>
                {t('Objects')}
                {state.actions.deleteCurrent.isChecked && (
                  <Label
                    variant="outline"
                    color="blue"
                    className="pf-v6-u-mx-xs"
                  >
                    {t('Selected')}
                  </Label>
                )}
                {invalidDeleteCurrent && (
                  <Label
                    variant="outline"
                    color="red"
                    className="pf-v6-u-mx-xs"
                  >
                    {t('Details needed')}
                  </Label>
                )}
              </span>
            </Content>
            <Content
              component={ContentVariants.small}
              className={invalidDeleteCurrent && 's3-lifecycle--margin'}
            >
              {t('Delete an object after a specified time.')}
            </Content>
          </AccordionToggle>
          <AccordionContent id={Actions.CURRENT_OBJECTS}>
            <CurrentObjects state={state} dispatch={dispatch} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem isExpanded={expanded === Actions.NONCURRENT_OBJECTS}>
          <AccordionToggle
            onClick={() => {
              onToggle(Actions.NONCURRENT_OBJECTS);
            }}
            id={Actions.NONCURRENT_OBJECTS}
          >
            <Content
              component={ContentVariants.h3}
              className="pf-v6-u-text-align-left"
            >
              <span>
                {t('Noncurrent versions of objects')}
                {state.actions.deleteNonCurrent.isChecked && (
                  <Label
                    variant="outline"
                    color="blue"
                    className="pf-v6-u-mx-xs"
                  >
                    {t('Selected')}
                  </Label>
                )}
                {invalidDeleteNonCurrent && (
                  <Label
                    variant="outline"
                    color="red"
                    className="pf-v6-u-mx-xs"
                  >
                    {t('Details needed')}
                  </Label>
                )}
              </span>
            </Content>
            <Content component={ContentVariants.small}>
              {t(
                'Delete older versions of objects after they become noncurrent (e.g., a new version overwrites them). Applies only to versioned buckets.'
              )}
            </Content>
          </AccordionToggle>
          <AccordionContent id={Actions.NONCURRENT_OBJECTS}>
            <NonCurrentObjects state={state} dispatch={dispatch} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem isExpanded={expanded === Actions.INCOMPLETE_UPLOADS}>
          <AccordionToggle
            onClick={() => {
              onToggle(Actions.INCOMPLETE_UPLOADS);
            }}
            id={Actions.INCOMPLETE_UPLOADS}
          >
            <Content
              component={ContentVariants.h3}
              className="pf-v6-u-text-align-left"
            >
              <span>
                {t('Incomplete multipart uploads')}
                {state.actions.deleteIncompleteMultiparts.isChecked && (
                  <Label
                    variant="outline"
                    color="blue"
                    className="pf-v6-u-mx-xs"
                  >
                    {t('Selected')}
                  </Label>
                )}
                {invalidDeleteMultiparts && (
                  <Label
                    variant="outline"
                    color="red"
                    className="pf-v6-u-mx-xs"
                  >
                    {t('Details needed')}
                  </Label>
                )}
              </span>
            </Content>
            <Content component={ContentVariants.small}>
              {t(
                'Clean up abandoned uploads to prevent accruing unnecessary storage costs. Targets multipart uploads that were initiated but never completed.'
              )}
            </Content>
          </AccordionToggle>
          <AccordionContent id={Actions.INCOMPLETE_UPLOADS}>
            <IncompleteMultipartUploads state={state} dispatch={dispatch} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem isExpanded={expanded === Actions.EXPIRED_MARKERS}>
          <AccordionToggle
            onClick={() => {
              onToggle(Actions.EXPIRED_MARKERS);
            }}
            id={Actions.EXPIRED_MARKERS}
          >
            <Content
              component={ContentVariants.h3}
              className="pf-v6-u-text-align-left"
            >
              {t('Expired object delete markers')}
              {state.actions.deleteExpiredMarkers && (
                <Label variant="outline" color="blue" className="pf-v6-u-mx-xs">
                  {t('Selected')}
                </Label>
              )}
            </Content>
            <Content component={ContentVariants.small}>
              {t(
                'Remove unnecessary delete markers that clutter bucket listings and do not serve a purpose. Targets delete markers in versioned buckets that do not have any associated object versions (orphaned delete markers).'
              )}
            </Content>
          </AccordionToggle>
          <AccordionContent id={Actions.EXPIRED_MARKERS}>
            <ExpiredDeleteMarkers state={state} dispatch={dispatch} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
};
