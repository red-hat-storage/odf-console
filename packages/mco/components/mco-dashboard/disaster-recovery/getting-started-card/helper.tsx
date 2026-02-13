import * as React from 'react';
import { EnrollApplicationButton } from '@odf/mco/components/protected-applications/components';
import { gettingStartedDRDocs, DR_BASE_ROUTE } from '@odf/mco/constants';
import { getDRPolicyResourceObj } from '@odf/mco/hooks';
import { DRPolicyKind } from '@odf/mco/types';
import { DRPolicyModel } from '@odf/shared';
import { StepsCountBadge } from '@odf/shared/badges';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel, ViewDocumentation } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Trans, TFunction } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Button, ButtonVariant } from '@patternfly/react-core';
import './getting-started-card.scss';

const PolicyFooterSection: React.FC = () => {
  const { t } = useCustomTranslation();

  const navigate = useNavigate();
  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] =
    useK8sWatchResource<DRPolicyKind[]>(getDRPolicyResourceObj());

  const loadedWOError = drPoliciesLoaded && !drPoliciesLoadError;
  const policyCount = drPolicies?.length;
  return (
    <div className="pf-v6-u-mt-md">
      <Button
        variant={ButtonVariant.secondary}
        className="pf-v6-u-mb-xs mco-policy--footer"
        onClick={() =>
          navigate(
            `${DR_BASE_ROUTE}/policies/${referenceForModel(DRPolicyModel)}/~new`
          )
        }
      >
        {t('Create a disaster recovery policy')}
      </Button>
      {loadedWOError &&
        (!policyCount ? (
          <p className="text-muted">{t('No disaster recovery policies.')}</p>
        ) : (
          // "toString" is needed otherwise RTL gives "Objects are not valid as a React child" error
          <Trans t={t}>
            <p className="text-muted">
              You have {policyCount.toString()} disaster recovery policies.{' '}
              <Button
                variant={ButtonVariant.link}
                onClick={() => navigate(`${DR_BASE_ROUTE}/policies`)}
                isInline
              >
                {t('View policies')}
              </Button>
            </p>
          </Trans>
        ))}
    </div>
  );
};

const EnrollAppFooterSection: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <div className="mco-enroll-app--footer pf-v6-u-mt-md">
      <EnrollApplicationButton toggleVariant="secondary" isNoDataMessage />
      <Trans t={t}>
        <p className="text-muted pf-v6-u-mt-sm">
          View enrolled apps under{' '}
          <span className="pf-v6-u-font-weight-bold">
            Protected applications
          </span>
          .
        </p>
      </Trans>
    </div>
  );
};

export const HeaderSection: React.FC<{
  stepCount: number;
  heading: string;
}> = ({ stepCount, heading }) => {
  return (
    <p className="pf-v6-u-mb-md">
      <span className="pf-v6-u-mr-sm">
        <StepsCountBadge stepCount={stepCount} />
      </span>{' '}
      <span className="pf-v6-u-font-weight-bold">{heading}</span>
    </p>
  );
};

export const BodySection: React.FC<{
  message: string;
  docLink?: string;
  docText?: string;
}> = ({ message, docLink, docText }) => {
  return (
    <>
      {message}
      <ViewDocumentation doclink={docLink} text={docText} padding="15px 0px" />
    </>
  );
};

type GettingStartedSteps = {
  // header
  stepCount: number;
  heading: string;
  // body
  message: string;
  docLink?: string;
  docText?: string;
  // footer
  FooterComponent?: React.FC;
}[];

export const gettingStartedSteps = (
  t: TFunction<string>,
  mcoDocVersion: string
): GettingStartedSteps => [
  {
    // header
    stepCount: 1,
    heading: t('Create policy'),
    // body
    message: t(
      'Decide how often your data should be replicated and where it should be stored, either regionally or within your local area, to ensure a quick recovery in case of a disaster.'
    ),
    docLink: gettingStartedDRDocs(mcoDocVersion).CREATE_POLICY,
    docText: t('See documentation'),
    // footer
    FooterComponent: PolicyFooterSection,
  },
  {
    // header
    stepCount: 2,
    heading: t('Enroll applications'),
    // body
    message: t(
      'Add disaster recovery protection to your application to boost resilience and minimise downtime.'
    ),
    // footer
    FooterComponent: EnrollAppFooterSection,
  },
  {
    // header
    stepCount: 3,
    heading: t('Monitoring resources (optional)'),
    // body
    message: t(
      'Monitoring offers an enhanced perspective on disaster recovery, providing a more optimized view of the ongoing replication and status of volumes at both cluster and application levels.'
    ),
    docLink: gettingStartedDRDocs(mcoDocVersion).ENABLE_MONITORING,
    docText: t('Steps to enable monitoring'),
  },
];
