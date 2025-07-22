import * as React from 'react';
import { Bullseye } from '@patternfly/react-core';

type ErrorCardBodyProps = {
  title: string;
};

export const ErrorCardBody: React.FC<ErrorCardBodyProps> = ({ title }) => {
  return <Bullseye>{title}</Bullseye>;
};
