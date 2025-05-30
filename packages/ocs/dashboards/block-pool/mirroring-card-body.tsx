import * as React from 'react';
import { DescriptionList } from '@patternfly/react-core';
import './mirroring-card.scss';

export const MirroringCardBody: React.FC<MirroringCardBodyProps> = ({
  children,
}) => <DescriptionList>{children}</DescriptionList>;

type MirroringCardBodyProps = {
  children: React.ReactNode;
};
