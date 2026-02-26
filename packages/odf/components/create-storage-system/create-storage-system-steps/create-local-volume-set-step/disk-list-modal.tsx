import * as React from 'react';
import { DiskMetadata } from '@odf/core/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import {
  TableData,
  useActiveColumns,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Modal as PfModal,
  ModalProps as PfModalProps,
} from '@patternfly/react-core/deprecated';
import classNames from 'classnames';
import { Button } from '@patternfly/react-core';
import { sortable } from '@patternfly/react-table';
import './disk-list-modal.scss';

const tableColumnClasses = [
  { className: '', id: 'name' },
  { className: '', id: 'node' },
  { className: classNames('pf-m-hidden', 'pf-m-visible-on-xl'), id: 'type' },
  { className: classNames('pf-m-hidden', 'pf-m-visible-on-2xl'), id: 'model' },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-lg'),
    id: 'capacity',
  },
];

const DiskRow = ({ obj, activeColumnIDs }) => {
  return (
    <>
      <TableData {...tableColumnClasses[0]} activeColumnIDs={activeColumnIDs}>
        {obj.path}
      </TableData>
      <TableData {...tableColumnClasses[1]} activeColumnIDs={activeColumnIDs}>
        {obj.node}
      </TableData>
      <TableData {...tableColumnClasses[2]} activeColumnIDs={activeColumnIDs}>
        {obj.type || '-'}
      </TableData>
      <TableData
        {...tableColumnClasses[3]}
        className={classNames(tableColumnClasses[3].className, 'co-break-word')}
        activeColumnIDs={activeColumnIDs}
      >
        {obj.model || '-'}
      </TableData>
      <TableData {...tableColumnClasses[4]} activeColumnIDs={activeColumnIDs}>
        {humanizeBinaryBytes(obj.size).string || '-'}
      </TableData>
    </>
  );
};

export const Modal: React.FC<ModalProps> = ({
  isFullScreen = false,
  className,
  ...props
}) => (
  <PfModal
    {...props}
    className={classNames('ocs-modal', className)}
    appendTo={() =>
      isFullScreen ? document.body : document.querySelector('#modal-container')
    }
  />
);

type ModalProps = {
  isFullScreen?: boolean;
  ref?: React.LegacyRef<PfModal>;
} & PfModalProps;

export const DiskListModal: React.FC<DiskListModalProps> = ({
  showDiskList,
  onCancel,
  disks,
}) => {
  const { t } = useCustomTranslation();

  const DiskHeader = React.useMemo(() => {
    return [
      {
        title: t('Name'),
        sort: 'path',
        transforms: [sortable],
        props: { className: tableColumnClasses[0].className },
        id: tableColumnClasses[0].id,
      },
      {
        title: t('Node'),
        sort: 'node',
        transforms: [sortable],
        props: { className: tableColumnClasses[1].className },
        id: tableColumnClasses[1].id,
      },
      {
        title: t('Type'),
        sort: 'type',
        transforms: [sortable],
        props: { className: tableColumnClasses[2].className },
        id: tableColumnClasses[2].id,
      },
      {
        title: t('Model'),
        sort: 'model',
        transforms: [sortable],
        props: { className: tableColumnClasses[3].className },
        id: tableColumnClasses[3].id,
      },
      {
        title: t('Capacity'),
        sort: 'size',
        transforms: [sortable],
        props: { className: tableColumnClasses[4].className },
        id: tableColumnClasses[4].id,
      },
    ];
  }, [t]);

  const [columns] = useActiveColumns({
    columns: DiskHeader as any, // Todo(bipuldh): Remove any after SDK update
    showNamespaceOverride: false,
    columnManagementID: 'DISKS_LIST',
  });

  return (
    <Modal
      title={t('Selected Disks')}
      isOpen={showDiskList}
      onClose={onCancel}
      className="ceph-ocs-install__filtered-modal"
      actions={[
        <Button key="confirm" variant="primary" onClick={onCancel}>
          {t('Close')}
        </Button>,
      ]}
    >
      <VirtualizedTable
        aria-label="Disk List"
        data={disks}
        columns={columns}
        Row={DiskRow}
        unfilteredData={disks}
        loaded={!!disks}
        loadError={false}
      />
    </Modal>
  );
};

type DiskListModalProps = {
  showDiskList: boolean;
  disks: DiskMetadata[];
  onCancel: () => void;
};
