import * as React from 'react';
import { ResourceSummary } from '@odf/shared/details-page/DetailsPage';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { LaunchModal } from '@odf/shared/modals/modalLauncher';
import { K8sResourceKind } from '@odf/shared/types';
import { Conditions } from '@odf/shared/utils/Conditions';
import {
  K8sModel,
  ResourceYAMLEditor,
  ResourceEventStream,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Flex, FlexItem, Title } from '@patternfly/react-core';
import './common-details.scss';

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
  launchModal: LaunchModal;
};

export const CommonDetails: React.FC<CommonDetailsSectionProps> = ({
  resource,
  resourceModel,
  children,
  launchModal,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="co-m-pane__body">
        <SectionHeading
          text={t('{{resource}} overview', { resource: resourceModel.label })}
        />
        <div className="row">
          <div className="col-sm-6">
            <ResourceSummary
              resource={resource}
              launchModal={launchModal}
              resourceModel={resourceModel}
            />
          </div>
        </div>
      </div>
      <div className="co-m-pane__body">{children}</div>
      <div className="co-m-pane__body">
        <div className="row">
          <div className="co-m-pane__body">
            <SectionHeading text={t('Conditions')} />
            <Conditions conditions={(resource as any)?.status?.conditions} />
          </div>
        </div>
      </div>
    </>
  );
};

type WrappedProps = {
  obj?: K8sResourceKind;
};

export const YAMLEditorWrapped: React.FC<WrappedProps> = ({ obj }) => (
  <ResourceYAMLEditor initialResource={obj} />
);

export const EventStreamWrapped: React.FC<WrappedProps> = ({ obj }) => (
  <ResourceEventStream resource={obj} />
);
