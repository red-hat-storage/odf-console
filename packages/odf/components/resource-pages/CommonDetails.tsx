import * as React from 'react';
import { ResourceSummary } from '@odf/shared/details-page/DetailsPage';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Conditions } from '@odf/shared/utils/Conditions';
import {
  K8sModel,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { Flex, FlexItem, Title } from '@patternfly/react-core';
import './common-details.scss';
import '../../style.scss';

type DetailsItemProps = {
  field: string;
  padChildElement?: boolean; // Add slight padding to the left for cascade effect
  showBorder?: boolean;
};

export const DetailsItem: React.FC<DetailsItemProps> = ({
  field,
  children,
  padChildElement = false,
  showBorder = false,
}) => (
  <Flex
    direction={{ default: 'column' }}
    className={classNames('details-item', {
      'details-item--border': showBorder,
    })}
  >
    <FlexItem>
      <Title headingLevel="h6" size="md">
        {field}
      </Title>
    </FlexItem>
    <FlexItem
      className={classNames({ 'details-item__child--pad': padChildElement })}
    >
      {children}
    </FlexItem>
  </Flex>
);

type CommonDetailsSectionProps = {
  resource: K8sResourceCommon;
  resourceModel: K8sModel;
};

export const CommonDetails: React.FC<CommonDetailsSectionProps> = ({
  resource,
  resourceModel,
  children,
}) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <div className="odf-m-pane__body">
        <SectionHeading
          text={t('{{resource}} overview', { resource: resourceModel.label })}
        />
        <div className="row">
          <div className="col-sm-6">
            <ResourceSummary
              resource={resource}
              resourceModel={resourceModel}
            />
          </div>
        </div>
      </div>
      <div className="odf-m-pane__body">{children}</div>
      <div className="odf-m-pane__body">
        <div className="row">
          <div className="odf-m-pane__body">
            <SectionHeading text={t('Conditions')} />
            <Conditions conditions={(resource as any)?.status?.conditions} />
          </div>
        </div>
      </div>
    </>
  );
};
