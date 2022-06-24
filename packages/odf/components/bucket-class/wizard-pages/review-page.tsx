import * as React from 'react';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { getName } from '@odf/shared/selectors';
import {
  GreenCheckCircleIcon,
  YellowExclamationTriangleIcon,
  BlueInfoCircleIcon,
  RedExclamationCircleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Title,
  pluralize,
  AlertVariant,
  Split,
  SplitItem,
  TextVariants,
  Text,
  TextContent,
} from '@patternfly/react-core';
import { NamespacePolicyType } from '../../../constants';
import { BucketClassType } from '../../../types';
import { convertTime, getTimeUnitString } from '../../../utils';
import {
  VALIDATIONS,
  ValidationMessage,
  ValidationType,
} from '../../utils/common-odf-install-el';
import { StoreCard } from '../review-utils';
import { State } from '../state';

/**
 * @deprecated
 */
const REVIEW_ICON_MAP = {
  [AlertVariant.success]: GreenCheckCircleIcon,
  [AlertVariant.warning]: YellowExclamationTriangleIcon,
  [AlertVariant.info]: BlueInfoCircleIcon,
  [AlertVariant.danger]: RedExclamationCircleIcon,
};

/**
 * @deprecated
 */
const ReviewListTitle: React.FC<{ text: string }> = ({ text }) => (
  <dt>
    <TextContent className="ocs-install-wizard__text-content">
      <Text component={TextVariants.h3} className="ocs-install-wizard__h3 ">
        {text}
      </Text>
    </TextContent>
  </dt>
);

/**
 * @deprecated
 */
type ReviewListBodyProps = {
  children: React.ReactNode;
  hideIcon?: boolean;
  noValue?: boolean;
  validation?: ValidationType;
};

/**
 * @deprecated
 */
const ReviewListBody: React.FC<ReviewListBodyProps> = ({
  children,
  validation,
  hideIcon = false,
  noValue = undefined,
}) => {
  const { t } = useTranslation();

  const alert = VALIDATIONS(validation, t);
  const Icon = noValue
    ? REVIEW_ICON_MAP[AlertVariant.danger]
    : REVIEW_ICON_MAP[alert?.variant || AlertVariant.success];

  return (
    <dd className="ocs-install-wizard__dd">
      {alert?.variant || !hideIcon ? (
        <Split>
          <SplitItem>
            <Icon className="ocs-install-wizard__icon" />
          </SplitItem>
          <SplitItem isFilled>
            {children}
            {alert?.variant ? (
              <ValidationMessage validation={validation} />
            ) : null}
          </SplitItem>
        </Split>
      ) : (
        children
      )}
    </dd>
  );
};

type ReviewPageProps = {
  state: State;
};

const ReviewPage: React.FC<ReviewPageProps> = ({ state }) => {
  const {
    bucketClassName,
    description,
    tier1BackingStore,
    tier2BackingStore,
    tier1Policy,
    tier2Policy,
    namespacePolicyType,
    bucketClassType,
    readNamespaceStore,
    hubNamespaceStore,
    cacheBackingStore,
    timeToLive,
    timeUnit,
    writeNamespaceStore,
  } = state;
  const { error, isLoading } = state;
  const { t } = useTranslation();

  const getReviewForNamespaceStore = () => (
    <>
      <ReviewListBody hideIcon>
        <span>{t('plugin__odf-console~Namespace Policy: ')}</span>&nbsp;
        <span className="text-secondary">{namespacePolicyType}</span>
      </ReviewListBody>
      {namespacePolicyType === NamespacePolicyType.SINGLE && (
        <ReviewListBody hideIcon>
          <span>
            {t('plugin__odf-console~Read and write NamespaceStore : ')}
          </span>
          &nbsp;
          <span className="text-secondary">
            {readNamespaceStore[0]?.metadata.name}
          </span>
        </ReviewListBody>
      )}
      {namespacePolicyType === NamespacePolicyType.CACHE && (
        <>
          <ReviewListBody hideIcon>
            <span>{t('plugin__odf-console~Hub namespace store: ')}</span>&nbsp;
            <span className="text-secondary">{getName(hubNamespaceStore)}</span>
          </ReviewListBody>
          <ReviewListBody hideIcon>
            <span>{t('plugin__odf-console~Cache backing store: ')}</span>&nbsp;
            <span className="text-secondary">{getName(cacheBackingStore)}</span>
          </ReviewListBody>
          <ReviewListBody hideIcon>
            <span>{t('plugin__odf-console~Time to live: ')}</span>&nbsp;
            <span className="text-secondary">{`${pluralize(
              convertTime(timeUnit, timeToLive),
              getTimeUnitString(timeUnit, t)
            )}`}</span>
          </ReviewListBody>
        </>
      )}
      {namespacePolicyType === NamespacePolicyType.MULTI && (
        <ReviewListBody hideIcon>
          <span>{t('plugin__odf-console~Resources ')}</span>&nbsp;
          <p>{t('plugin__odf-console~Selected read namespace stores: ')}</p>
          <StoreCard resources={readNamespaceStore} />
          <br />
          <span>
            {t('plugin__odf-console~Selected write namespace store: ')}
          </span>
          <span className="text-secondary">
            {getName(writeNamespaceStore[0])}
          </span>
        </ReviewListBody>
      )}
    </>
  );

  const getReviewForBackingStore = () => (
    <>
      <ReviewListBody hideIcon>
        <span>{t('plugin__odf-console~Placement policy details ')}</span>&nbsp;
        <br />
        <p data-test="tier1">
          <b>
            {t('plugin__odf-console~Tier 1: ')}
            {tier1Policy}
          </b>
        </p>
        <p>{t('plugin__odf-console~Selected BackingStores')}</p>
        <StoreCard resources={tier1BackingStore} />
      </ReviewListBody>
      <ReviewListBody hideIcon>
        {!!tier2Policy && (
          <>
            <p data-test="tier2">
              <b>
                {t('plugin__odf-console~Tier 2: ')}
                {tier2Policy}
              </b>
            </p>
            <p>{t('plugin__odf-console~Selected BackingStores')}</p>
            <StoreCard resources={tier2BackingStore} />
          </>
        )}
      </ReviewListBody>
    </>
  );

  return (
    <div className="nb-create-bc-step-page">
      <Title size="xl" headingLevel="h2">
        {t('plugin__odf-console~Review BucketClass')}
      </Title>
      <dl>
        <ReviewListTitle text={t('plugin__odf-console~General')} />
        <br />
        <div className="nb-create-bc-list--indent">
          <ReviewListBody hideIcon>
            <span>{t('plugin__odf-console~BucketClass type: ')}</span>&nbsp;
            <span className="text-secondary">{bucketClassType}</span>
          </ReviewListBody>
          <ReviewListBody hideIcon>
            <span>{t('plugin__odf-console~BucketClass name: ')}</span>&nbsp;
            <span data-test="bc-name" className="text-secondary">
              {bucketClassName}
            </span>
          </ReviewListBody>
          {!!description && (
            <ReviewListBody hideIcon>
              <span>{t('plugin__odf-console~Description: ')}</span>&nbsp;
              <span data-test="bc-desc" className="text-secondary">
                {description}
              </span>
            </ReviewListBody>
          )}
          {bucketClassType === BucketClassType.NAMESPACE
            ? getReviewForNamespaceStore()
            : getReviewForBackingStore()}
        </div>
      </dl>
      {isLoading && <LoadingInline />}
      {!!error && (
        <Alert variant="danger" title="Error" isInline>
          {error}
        </Alert>
      )}
    </div>
  );
};

export default ReviewPage;
