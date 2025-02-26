import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Card,
  CardHeader,
  CardBody,
  Title,
  TitleSizes,
  ExpandableSection,
} from '@patternfly/react-core';
import './GettingStartedExpandableGrid.scss';

type GettingStartedExpandableGridProps = {
  toggleContent?: React.ReactNode;
  title?: string;
  children?: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  hideExpandable?: boolean;
};

type ExpandableGridCardProps = {
  titleText?: string;
  children?: React.ReactNode;
  showHeader?: boolean;
};

const CardTitle: React.FC<{ titleText: string }> = ({ titleText }) => {
  return (
    <Title
      headingLevel="h2"
      size={TitleSizes.lg}
      data-test="title"
      className="ocs-getting-started-expandable-section__toggle-text"
    >
      {titleText}
    </Title>
  );
};

const ExpandableGridCard: React.FC<ExpandableGridCardProps> = ({
  titleText,
  children,
  showHeader,
}) => {
  return (
    <Card
      className="ocs-getting-started-expandable-grid"
      data-test="getting-started"
    >
      {!!showHeader && (
        <CardHeader>
          <CardTitle titleText={titleText} />
        </CardHeader>
      )}
      <CardBody>{children}</CardBody>
    </Card>
  );
};

export const GettingStartedExpandableGrid: React.FC<
  GettingStartedExpandableGridProps
> = ({ toggleContent, title, children, isOpen, setIsOpen, hideExpandable }) => {
  const { t } = useCustomTranslation();

  const titleText = title || t('Getting started resources');
  return !hideExpandable ? (
    <ExpandableSection
      onToggle={() => setIsOpen(!isOpen)}
      isExpanded={isOpen}
      displaySize="lg"
      className="ocs-getting-started-expandable-section"
      toggleContent={
        !toggleContent ? <CardTitle titleText={titleText} /> : toggleContent
      }
      data-test="getting-started-expandable"
    >
      <ExpandableGridCard>{children}</ExpandableGridCard>
    </ExpandableSection>
  ) : (
    <ExpandableGridCard titleText={titleText} showHeader>
      {children}
    </ExpandableGridCard>
  );
};
