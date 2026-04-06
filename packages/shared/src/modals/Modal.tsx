import * as React from 'react';
import {
  ModalBoxBody,
  ModalBoxFooter,
  ModalBoxBodyProps,
  ModalBoxFooterProps,
} from '@patternfly/react-core/deprecated';
import classNames from 'classnames';
import { Title, TitleSizes } from '@patternfly/react-core';
import './modal.scss';

export type CommonModalProps<T = {}> = {
  isOpen: boolean;
  closeModal: () => void;
  extraProps: T;
};

export const ModalBody: React.FC<ModalBoxBodyProps> = ({
  children,
  className,
  ...props
}) => (
  <ModalBoxBody
    className={classNames('modal--padding', 'modal--overflow', className)}
    {...props}
  >
    {children}
  </ModalBoxBody>
);

type ModalHeaderProps = {
  className?: string;
};

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  className,
}) => (
  <Title headingLevel="h1" size={TitleSizes['2xl']} className={className}>
    {children}
  </Title>
);

export const ModalFooter: React.FC<ModalBoxFooterProps> = ({
  children,
  className,
  ...props
}) => (
  <ModalBoxFooter
    className={classNames('modalFooter--justifyEnd', className)}
    {...props}
  >
    {children}
  </ModalBoxFooter>
);
