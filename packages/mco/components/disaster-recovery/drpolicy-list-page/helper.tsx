import * as React from 'react';
import { ModalKeys } from '@odf/shared/modals/modalLauncher';
import classNames from 'classnames';
import { TFunction } from 'i18next';
import { sortable, wrappable } from '@patternfly/react-table';
import { Actions } from '../../../constants';

export const DRPolicyActions = {
  [Actions.MANAGE_DR_POLICY]: React.lazy(
    () => import('../../modals/drpolicy-apps-apply/apply-policy-modal')
  ),
  [Actions.APPLY_DR_POLICY]: React.lazy(
    () =>
      import(
        '../../modals/drpolicy-apps-apply/subscriptions/apply-policy-modal'
      )
  ),
};

export const Header = (t: TFunction) => [
  {
    title: t('Name'),
    sort: 'metadata.name',
    transforms: [sortable],
    props: {
      className: tableColumnInfo[0].className,
    },
    id: tableColumnInfo[0].id,
  },
  {
    title: t('Status'),
    transforms: [wrappable],
    props: {
      className: tableColumnInfo[1].className,
    },
    id: tableColumnInfo[1].id,
  },
  {
    title: t('Clusters'),
    transforms: [wrappable],
    props: {
      className: tableColumnInfo[2].className,
    },
    id: tableColumnInfo[2].id,
  },
  {
    title: t('Replication policy'),
    transforms: [wrappable],
    props: {
      className: tableColumnInfo[3].className,
    },
    id: tableColumnInfo[3].id,
  },
  {
    title: t('Connected applications'),
    transforms: [wrappable],
    props: {
      className: tableColumnInfo[4].className,
    },
    id: tableColumnInfo[4].id,
  },
  {
    title: '',
    props: {
      className: tableColumnInfo[5].className,
    },
    id: tableColumnInfo[5].id,
  },
];

export const tableColumnInfo = [
  { className: '', id: 'name' },
  { className: '', id: 'status' },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-sm'),
    id: 'clusters',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-md'),
    id: 'replicationPolicy',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-lg'),
    id: 'applications',
  },
  { className: 'dropdown-kebab-pf pf-c-table__action', id: '' },
];

export const kebabActionItems =
  (canDeleteDRPolicy, appsCount, appsLoaded, appsLoadedError) => (t) =>
    [
      {
        key: ModalKeys.DELETE,
        value: Actions.DELETE_DR_POLICY,
        props: {
          description: !!appsCount
            ? t('Cannot delete while connected to an application.')
            : '',
          isDisabled: !(
            canDeleteDRPolicy &&
            appsLoaded &&
            !appsLoadedError &&
            !appsCount
          ),
        },
      },
      {
        key: Actions.MANAGE_DR_POLICY,
        value: t('Manage policy for ApplicationSets'),
        props: {
          description: t(
            'Assign and unassign policy for apps using applicationSets.'
          ),
        },
      },
      {
        key: Actions.APPLY_DR_POLICY,
        value: t('Assign policy to Subscriptions'),
        props: {
          description: t('Use for apps using Subscriptions.'),
        },
      },
    ];
