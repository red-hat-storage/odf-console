import * as React from 'react';
import { LoadingBox } from '../generic/status-box';

const DefaultErrorMessage: React.FC<{ error: string }> = ({ error }) => (
  <>{error}</>
);

type HandleErrorAndLoadingProps = {
  loading: boolean;
  error: string;
  ErrorMessage?: React.FC<{ error: string }>;
};

const HandleErrorAndLoading: React.FC<HandleErrorAndLoadingProps> = ({
  loading,
  error,
  children,
  ErrorMessage = DefaultErrorMessage,
}) => {
  if (loading) {
    return <LoadingBox />;
  }
  if (error) {
    return <ErrorMessage error={error} />;
  }
  return <>{children}</>;
};

export default HandleErrorAndLoading;
