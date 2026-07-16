import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  ContentVariants,
  Content,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
  LabelGroup,
  Divider,
} from '@patternfly/react-core';
import { RuleState, RuleScope } from './reducer';

type ReviewPageProps = {
  state: RuleState;
  isEdit?: boolean;
};

const GeneralConfigReview: React.FC<ReviewPageProps> = ({ state }) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <Content component={ContentVariants.h3} className="pf-v6-u-mb-md">
        {t('General configuration')}
      </Content>
      <DescriptionList isHorizontal className="pf-v6-u-mb-lg">
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Rule name')}</DescriptionListTerm>
          <DescriptionListDescription>
            {state.name || '-'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Rule scope')}</DescriptionListTerm>
          <DescriptionListDescription>
            {state.scope === RuleScope.GLOBAL
              ? t('Global (Bucket-wide)')
              : t('Targeted')}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </>
  );
};

const ConditionalFiltersReview: React.FC<ReviewPageProps> = ({ state }) => {
  const { t } = useCustomTranslation();

  const { prefix, objectTags, minObjectSize, maxObjectSize } =
    state.conditionalFilters;

  const hasTags = objectTags.length > 0;
  const hasMinSize = minObjectSize.isChecked;
  const hasMaxSize = maxObjectSize.isChecked;

  const getSizeDisplay = () => {
    if (hasMinSize && hasMaxSize) {
      return t('{{min}} - {{max}} Bytes', {
        min: minObjectSize.sizeInB,
        max: maxObjectSize.sizeInB,
      });
    }
    if (hasMinSize) {
      return t('Minimum: {{size}} Bytes', { size: minObjectSize.sizeInB });
    }
    if (hasMaxSize) {
      return t('Maximum: {{size}} Bytes', { size: maxObjectSize.sizeInB });
    }
    return t('Not specified');
  };

  return (
    <>
      <Content component={ContentVariants.h3} className="pf-v6-u-mb-md">
        {t('Conditional filters')}
      </Content>
      <DescriptionList isHorizontal className="pf-v6-u-mb-lg">
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Prefix')}</DescriptionListTerm>
          <DescriptionListDescription>
            {prefix || t('Not specified')}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Object tags')}</DescriptionListTerm>
          <DescriptionListDescription>
            {hasTags ? (
              <LabelGroup>
                {objectTags.map((tag, index) => (
                  <Label key={index} color="blue">
                    {tag.Key}
                    {tag.Value ? `: ${tag.Value}` : ''}
                  </Label>
                ))}
              </LabelGroup>
            ) : (
              t('None')
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Object size')}</DescriptionListTerm>
          <DescriptionListDescription>
            {getSizeDisplay()}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </>
  );
};

const RuleActionsReview: React.FC<ReviewPageProps> = ({ state }) => {
  const { t } = useCustomTranslation();

  const {
    deleteCurrent,
    deleteNonCurrent,
    deleteIncompleteMultiparts,
    deleteExpiredMarkers,
  } = state.actions;

  const actions: { label: string; description: string }[] = [];

  if (deleteCurrent.isChecked) {
    actions.push({
      label: t('Delete objects'),
      description: t('After {{days}} days', { days: deleteCurrent.days }),
    });
  }

  if (deleteNonCurrent.isChecked) {
    let description = t('After {{days}} days', {
      days: deleteNonCurrent.days,
    });
    if (deleteNonCurrent.retention > 0) {
      description += `, ${t('retain {{count}} versions', { count: deleteNonCurrent.retention })}`;
    }
    actions.push({
      label: t('Delete noncurrent versions'),
      description,
    });
  }

  if (deleteIncompleteMultiparts.isChecked) {
    actions.push({
      label: t('Delete incomplete multipart uploads'),
      description: t('After {{days}} days', {
        days: deleteIncompleteMultiparts.days,
      }),
    });
  }

  if (deleteExpiredMarkers) {
    actions.push({
      label: t('Delete expired object delete markers'),
      description: t('Enabled'),
    });
  }

  return (
    <>
      <Content component={ContentVariants.h3} className="pf-v6-u-mb-md">
        {t('Lifecycle rule actions')}
      </Content>
      {actions.length > 0 ? (
        <DescriptionList isHorizontal className="pf-v6-u-mb-lg">
          {actions.map((action, index) => (
            <DescriptionListGroup key={index}>
              <DescriptionListTerm>{action.label}</DescriptionListTerm>
              <DescriptionListDescription>
                {action.description}
              </DescriptionListDescription>
            </DescriptionListGroup>
          ))}
        </DescriptionList>
      ) : (
        <Content component={ContentVariants.p} className="pf-v6-u-mb-lg">
          {t('No actions configured')}
        </Content>
      )}
    </>
  );
};

export const ReviewPage: React.FC<ReviewPageProps> = ({ state, isEdit }) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <Content className="pf-v6-u-mb-lg">
        <Content component={ContentVariants.h2}>
          {t('Review lifecycle rule')}
        </Content>
        <Content component={ContentVariants.small}>
          {isEdit
            ? t('Review the lifecycle rule configuration before updating it.')
            : t('Review the lifecycle rule configuration before creating it.')}
        </Content>
      </Content>

      <GeneralConfigReview state={state} />
      <Divider className="pf-v6-u-my-md" />

      {state.scope === RuleScope.TARGETED && (
        <>
          <ConditionalFiltersReview state={state} />
          <Divider className="pf-v6-u-my-md" />
        </>
      )}

      <RuleActionsReview state={state} />
    </>
  );
};
