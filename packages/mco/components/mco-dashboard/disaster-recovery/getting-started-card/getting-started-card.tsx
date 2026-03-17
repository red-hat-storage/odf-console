import * as React from 'react';
import {
  ACM_OBSERVABILITY_FLAG,
  GETTING_STARTED_USER_SETTINGS_KEY_OVERVIEW_DASHBOARD,
} from '@odf/mco/constants';
import { GettingStartedExpandableGrid } from '@odf/shared/getting-started-grid';
import { DOC_VERSION as mcoDocVersion } from '@odf/shared/hooks';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
// ToDo (Sanjal): Update sdk (stable & internal) version and remove these comments
// @ts-ignore
import { useUserSettings } from '@openshift-console/dynamic-plugin-sdk';
import { HeaderSection, BodySection, gettingStartedSteps } from './helper';

export const GettingStartedCard: React.FC = () => {
  const { t } = useCustomTranslation();

  const [isGettingStartedSectionOpen, setIsGettingStartedSectionOpen] =
    useUserSettings<boolean>(
      GETTING_STARTED_USER_SETTINGS_KEY_OVERVIEW_DASHBOARD,
      true
    );
  const isMonitoringEnabled = useFlag(ACM_OBSERVABILITY_FLAG);

  return (
    <GettingStartedExpandableGrid
      isOpen={isGettingStartedSectionOpen}
      setIsOpen={setIsGettingStartedSectionOpen}
      title={t('Getting started with disaster recovery')}
      hideExpandable={!isMonitoringEnabled}
    >
      <div className="pf-v6-u-display-flex pf-v6-u-flex-direction-column pf-v6-u-flex-direction-row-on-lg pf-v6-u-justify-content-space-between">
        {gettingStartedSteps(t, mcoDocVersion).map((step) => {
          const stepCount = step.stepCount;
          const FooterComponent = step.FooterComponent;
          return (
            <div
              className="pf-v6-u-display-flex pf-v6-u-flex-direction-column pf-v6-u-p-sm pf-v6-u-w-25-on-lg"
              key={stepCount}
            >
              <HeaderSection
                stepCount={stepCount}
                heading={step.heading}
                key={`${stepCount}-header`}
              />
              <BodySection
                message={step.message}
                docLink={step.docLink}
                docText={step.docText}
                key={`${stepCount}-body`}
              />
              {!!FooterComponent && (
                <FooterComponent key={`${stepCount}-footer`} />
              )}
            </div>
          );
        })}
      </div>
    </GettingStartedExpandableGrid>
  );
};
