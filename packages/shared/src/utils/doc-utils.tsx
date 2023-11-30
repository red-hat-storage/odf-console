import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Text, TextVariants } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

export const ViewDocumentation: React.FC<ViewDocumentationProps> = ({
  doclink,
  text,
  padding = '15px 10px',
}) => {
  const { t } = useCustomTranslation();
  return (
    <Text
      component={TextVariants.a}
      isVisitedLink
      href={doclink}
      target="_blank"
      style={{
        cursor: 'pointer',
        display: 'inline-block',
        padding: padding,
        fontSize: '14px',
      }}
    >
      {text || t('View documentation')} <ExternalLinkAltIcon />
    </Text>
  );
};

type ViewDocumentationProps = {
  doclink: string;
  text?: string;
  padding?: string;
};
