import * as React from 'react';
import {
  ACM_OBSERVABILITY_FLAG,
  GETTING_STARTED_USER_SETTINGS_KEY_OVERVIEW_DASHBOARD,
} from '@odf/mco/constants';
import { ODF_OPERATOR, ODF_DEFAULT_DOC_VERSION } from '@odf/shared/constants';
import { GettingStartedExpandableGrid } from '@odf/shared/getting-started-grid';
import { useDocVersion } from '@odf/shared/hooks';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { useUserSettings } from '@openshift-console/dynamic-plugin-sdk-internal';
import { HeaderSection, BodySection, gettingStartedSteps } from './helper';

export const GettingStartedCard: React.FC = () => {
  const { t } = useCustomTranslation();

  const odfVersion = useDocVersion({
    defaultDocVersion: ODF_DEFAULT_DOC_VERSION,
    specName: ODF_OPERATOR,
  });

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
      <div className="pf-v5-u-display-flex pf-v5-u-flex-direction-column pf-v5-u-flex-direction-row-on-lg">
        {gettingStartedSteps(t, odfVersion).map((step) => {
          const stepCount = step.stepCount;
          const FooterComponent = step.FooterComponent;
          return (
            <div
              className="pf-v5-u-display-flex pf-v5-u-flex-direction-column pf-v5-u-p-sm pf-v5-u-w-33-on-lg"
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
