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
  Button,
  ButtonVariant,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { StateAndDispatchProps, RuleActionType, FuncType } from './reducer';
import {
  isInvalidActionsCount,
  isInvalidDeleteCurrent,
  isInvalidDeleteNonCurrent,
  isInvalidDeleteMultiparts,
  isInvalidTransitionCurrent,
  isInvalidTransitionNonCurrent,
} from './validations';
import './create-lifecycle-rules.scss';

enum Actions {
  CURRENT_OBJECTS = 'CURRENT_OBJECTS',
  NONCURRENT_OBJECTS = 'NONCURRENT_OBJECTS',
  INCOMPLETE_UPLOADS = 'INCOMPLETE_UPLOADS',
  EXPIRED_MARKERS = 'EXPIRED_MARKERS',
  TRANSITION_CURRENT = 'TRANSITION_CURRENT',
  TRANSITION_NONCURRENT = 'TRANSITION_NONCURRENT',
}

type DaysInputProps = {
  id: string;
  days: number;
  onDaysChange: (days: number) => void;
  isInvalid: boolean;
  helperText: string;
};

const DaysInput: React.FC<DaysInputProps> = ({
  id,
  days,
  onDaysChange,
  isInvalid,
  helperText,
}) => {
  const { t } = useCustomTranslation();

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (['-', '+', 'e', 'E', '.'].includes(event.key)) {
      event.preventDefault();
    }
  };

  return (
    <div className="pf-v6-u-w-25">
      <TextInput
        id={id}
        value={days}
        onChange={(_e, value) => onDaysChange(Math.round(+value || 0))}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (days < 1) {
            onDaysChange(1);
          }
        }}
        placeholder={t('Enter number of days')}
        type="number"
        min={1}
        validated={
          isInvalid ? ValidatedOptions.error : ValidatedOptions.default
        }
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem
            variant={
              isInvalid ? ValidatedOptions.error : ValidatedOptions.default
            }
          >
            {isInvalid ? t('Must be an integer greater than 0.') : helperText}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </div>
  );
};

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
            <DaysInput
              id="incomplete-multiparts-delete-days"
              days={deleteIncompleteMultiparts.days}
              onDaysChange={(days) =>
                dispatch({
                  type: RuleActionType.RULE_DELETE_MULTIPARTS_ACTION,
                  payload: { ...deleteIncompleteMultiparts, days },
                })
              }
              isInvalid={invalidDeleteMultiparts}
              helperText={t('Period of time (in days).')}
            />
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
            <DaysInput
              id="noncurrent-object-delete-days"
              days={deleteNonCurrent.days}
              onDaysChange={(days) =>
                dispatch({
                  type: RuleActionType.RULE_DELETE_NON_CURRENT_ACTION,
                  payload: { ...deleteNonCurrent, days },
                })
              }
              isInvalid={invalidDeleteNonCurrent}
              helperText={t(
                'Period of time (in days) after which a noncurrent versions of object would be deleted since turning noncurrent.'
              )}
            />

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
          <DaysInput
            id="current-object-delete-days"
            days={deleteCurrent.days}
            onDaysChange={(days) =>
              dispatch({
                type: RuleActionType.RULE_DELETE_CURRENT_ACTION,
                payload: { ...deleteCurrent, days },
              })
            }
            isInvalid={invalidDeleteCurrent}
            helperText={t(
              'Period of time (in days) after which an object would be deleted since its creation.'
            )}
          />
        ) : null
      }
    />
  );
};

const TransitionCurrentObjects: React.FC<StateAndDispatchProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const transitionCurrent = state.actions.transitionCurrent;

  const invalidTransitionCurrent =
    state.triggerInlineValidations && isInvalidTransitionCurrent(state);

  return (
    <Checkbox
      id="current-object-transition"
      label={t('Transition storage class')}
      description={t(
        'Move current object versions to IBM Deep Archive storage class after a specified number of days.'
      )}
      className="pf-v6-u-ml-xl"
      isChecked={transitionCurrent.isChecked}
      onChange={(_e, checked) =>
        dispatch({
          type: RuleActionType.RULE_TRANSITION_CURRENT_ACTION,
          payload: { ...transitionCurrent, isChecked: checked },
        })
      }
      body={
        transitionCurrent.isChecked ? (
          <>
            <Content className="pf-v6-u-mb-md">
              <Content component={ContentVariants.p}>
                {t('Storage class: ')}{' '}
                <Label color="blue">{t('IBM Deep Archive Standard')}</Label>
              </Content>
            </Content>
            <DaysInput
              id="current-object-transition-days"
              days={transitionCurrent.days}
              onDaysChange={(days) =>
                dispatch({
                  type: RuleActionType.RULE_TRANSITION_CURRENT_ACTION,
                  payload: { ...transitionCurrent, days },
                })
              }
              isInvalid={invalidTransitionCurrent}
              helperText={t(
                'Period of time (in days) after which an object would be transitioned since its creation.'
              )}
            />
          </>
        ) : null
      }
    />
  );
};

const TransitionNonCurrentObjects: React.FC<StateAndDispatchProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const transitionNonCurrent = state.actions.transitionNonCurrent;

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
        newRetention = Math.max(transitionNonCurrent.retention - 1, 0);
        break;
      }
      case FuncType.ON_PLUS: {
        newRetention = Math.min(transitionNonCurrent.retention + 1, 100);
        break;
      }
    }
    dispatch({
      type: RuleActionType.RULE_TRANSITION_NON_CURRENT_ACTION,
      payload: {
        ...transitionNonCurrent,
        retention: newRetention,
      },
    });
  };

  const invalidTransitionNonCurrent =
    state.triggerInlineValidations && isInvalidTransitionNonCurrent(state);

  return (
    <Checkbox
      id="noncurrent-object-transition"
      label={t('Transition storage class')}
      description={t(
        'Move noncurrent object versions to IBM Deep Archive storage class after they become noncurrent.'
      )}
      className="pf-v6-u-ml-xl"
      isChecked={transitionNonCurrent.isChecked}
      onChange={(_e, checked) =>
        dispatch({
          type: RuleActionType.RULE_TRANSITION_NON_CURRENT_ACTION,
          payload: { ...transitionNonCurrent, isChecked: checked },
        })
      }
      body={
        transitionNonCurrent.isChecked ? (
          <>
            <Content className="pf-v6-u-mb-md">
              <Content component={ContentVariants.p}>
                {t('Storage class: ')}{' '}
                <Label color="blue">{t('IBM Deep Archive Standard')}</Label>
              </Content>
            </Content>
            <DaysInput
              id="noncurrent-object-transition-days"
              days={transitionNonCurrent.days}
              onDaysChange={(days) =>
                dispatch({
                  type: RuleActionType.RULE_TRANSITION_NON_CURRENT_ACTION,
                  payload: { ...transitionNonCurrent, days },
                })
              }
              isInvalid={invalidTransitionNonCurrent}
              helperText={t(
                'Period of time (in days) after which a noncurrent version of object would be transitioned since turning noncurrent.'
              )}
            />

            <Content className="pf-v6-u-mt-lg">
              <Content component={ContentVariants.p}>
                {t('Preserve object version history (Optional)')}
              </Content>
              <Content
                component={ContentVariants.small}
                className="s3-lifecycle-action--margin"
              >
                {t(
                  'Keep up to 100 noncurrent versions of objects for version management and rollback. Excess versions will be automatically transitioned.'
                )}
              </Content>
            </Content>
            <NumberInput
              value={transitionNonCurrent.retention}
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

type RuleActionsProps = StateAndDispatchProps & {
  isDeepArchiveEnabled: boolean;
};

export const RuleActions: React.FC<RuleActionsProps> = ({
  state,
  dispatch,
  isDeepArchiveEnabled,
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
  const [invalidActionsCount, actionsCount] = isInvalidActionsCount(
    state,
    isDeepArchiveEnabled
  );
  const invalidDeleteCurrent = validate && isInvalidDeleteCurrent(state);
  const invalidDeleteNonCurrent = validate && isInvalidDeleteNonCurrent(state);
  const invalidDeleteMultiparts = validate && isInvalidDeleteMultiparts(state);
  const invalidTransitionCurrent =
    isDeepArchiveEnabled && validate && isInvalidTransitionCurrent(state);
  const invalidTransitionNonCurrent =
    isDeepArchiveEnabled && validate && isInvalidTransitionNonCurrent(state);

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
            <strong>{'{{actionsCount}}'} lifecycle rules.</strong>
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
              className={`s3-lifecycle-action-description ${invalidDeleteCurrent ? 's3-lifecycle--margin' : ''}`}
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
            <Content
              component={ContentVariants.small}
              className="s3-lifecycle-action-description"
            >
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
            <Content
              component={ContentVariants.small}
              className="s3-lifecycle-action-description"
            >
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
            <Content
              component={ContentVariants.small}
              className="s3-lifecycle-action-description"
            >
              {t(
                'Remove unnecessary delete markers that clutter bucket listings and do not serve a purpose. Targets delete markers in versioned buckets that do not have any associated object versions (orphaned delete markers).'
              )}
            </Content>
          </AccordionToggle>
          <AccordionContent id={Actions.EXPIRED_MARKERS}>
            <ExpiredDeleteMarkers state={state} dispatch={dispatch} />
          </AccordionContent>
        </AccordionItem>

        {isDeepArchiveEnabled && (
          <AccordionItem isExpanded={expanded === Actions.TRANSITION_CURRENT}>
            <AccordionToggle
              onClick={() => {
                onToggle(Actions.TRANSITION_CURRENT);
              }}
              id={Actions.TRANSITION_CURRENT}
            >
              <Content
                component={ContentVariants.h3}
                className="pf-v6-u-text-align-left"
              >
                <span>
                  {t(
                    'Transition current versions of objects to IBM Deep archive'
                  )}
                  {state.actions.transitionCurrent.isChecked && (
                    <Label
                      variant="outline"
                      color="blue"
                      className="pf-v6-u-mx-xs"
                    >
                      {t('Selected')}
                    </Label>
                  )}
                  {invalidTransitionCurrent && (
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
                className={`s3-lifecycle-action-description ${invalidTransitionCurrent ? 's3-lifecycle--margin' : ''}`}
              >
                {t(
                  'Move current versions of objects to IBM Deep archive storage class for cheaper cold storage. These transitions start from when the objects are created and are consecutively applied.'
                )}{' '}
                <Button
                  variant={ButtonVariant.link}
                  isInline
                  icon={<ExternalLinkAltIcon />}
                  iconPosition="end"
                  component="a"
                  href="https://cloud.ibm.com/docs/cloud-object-storage?topic=cloud-object-storage-archive"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('Know more')}
                </Button>
              </Content>
            </AccordionToggle>
            <AccordionContent id={Actions.TRANSITION_CURRENT}>
              <TransitionCurrentObjects state={state} dispatch={dispatch} />
            </AccordionContent>
          </AccordionItem>
        )}

        {isDeepArchiveEnabled && (
          <AccordionItem
            isExpanded={expanded === Actions.TRANSITION_NONCURRENT}
          >
            <AccordionToggle
              onClick={() => {
                onToggle(Actions.TRANSITION_NONCURRENT);
              }}
              id={Actions.TRANSITION_NONCURRENT}
            >
              <Content
                component={ContentVariants.h3}
                className="pf-v6-u-text-align-left"
              >
                <span>
                  {t(
                    'Transition noncurrent versions of objects to IBM Deep archive'
                  )}
                  {state.actions.transitionNonCurrent.isChecked && (
                    <Label
                      variant="outline"
                      color="blue"
                      className="pf-v6-u-mx-xs"
                    >
                      {t('Selected')}
                    </Label>
                  )}
                  {invalidTransitionNonCurrent && (
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
                className={`s3-lifecycle-action-description ${invalidTransitionNonCurrent ? 's3-lifecycle--margin' : ''}`}
              >
                {t(
                  'Move noncurrent versions of objects to IBM Deep archive storage class for cheaper cold storage. These transitions start from when the objects become non-current and are consecutively applied.'
                )}{' '}
                <Button
                  variant={ButtonVariant.link}
                  isInline
                  icon={<ExternalLinkAltIcon />}
                  iconPosition="end"
                  component="a"
                  href="https://cloud.ibm.com/docs/cloud-object-storage?topic=cloud-object-storage-archive"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('Know more')}
                </Button>
              </Content>
            </AccordionToggle>
            <AccordionContent id={Actions.TRANSITION_NONCURRENT}>
              <TransitionNonCurrentObjects state={state} dispatch={dispatch} />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </>
  );
};
