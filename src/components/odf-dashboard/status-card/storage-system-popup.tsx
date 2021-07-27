import { HealthState } from 'badhikar-dynamic-plugin-sdk';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import * as React from 'react';
import Status, { StatusPopupSection } from '../../common/popup/status-popup';
import { Link } from 'react-router-dom';

export type SystemHealthMap = {
  systemName: string;
  healthState: HealthState;
  link: string;
};

type StorageSystemPopopProps = {
  systemHealthMap: SystemHealthMap[];
};

const healthStateToIcon = {
  [HealthState.OK]: <CheckCircleIcon />,
  [HealthState.ERROR]: <ExclamationCircleIcon />,
};

const StorageSystemPopup: React.FC<StorageSystemPopopProps> = ({
  systemHealthMap,
}) => {
  return (
    <StatusPopupSection firstColumn="Storage System" secondColumn="Health">
      {systemHealthMap.map((system) => (
        <Status
          key={system.systemName}
          icon={healthStateToIcon[system.healthState]}
        >
          <Link to={system.link}>{system.systemName}</Link>
        </Status>
      ))}
    </StatusPopupSection>
  );
};

export default StorageSystemPopup;
