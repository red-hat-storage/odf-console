import * as React from 'react';
import { RedExclamationCircleIcon } from '@odf/shared/status/icons';
import StatusIconAndText from '@odf/shared/status/StatusIconAndText';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getAlertSeverity } from '@odf/shared/utils';
import {
  Alert,
  AlertSeverity,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  AlertItem,
  AlertsBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Badge,
  Title,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';
import { Divider } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import './alerts.scss';
import { FieldLevelHelp } from '../generic';

type AlertBadgeProps = {
  alerts: Alert[];
  alertSeverity: AlertSeverity;
  key?: number;
  onToggle: Function;
};

const AlertBadge: React.FC<AlertBadgeProps> = ({
  alerts,
  alertSeverity,
  key,
  onToggle,
}) => {
  let icon: JSX.Element;
  switch (alertSeverity) {
    case AlertSeverity.Critical:
      icon = <RedExclamationCircleIcon />;
      break;
    case AlertSeverity.Warning:
      icon = <YellowExclamationTriangleIcon />;
      break;
    default:
      icon = <InfoCircleIcon />;
  }

  const onClick = () => onToggle(`alert-toggle-${alertSeverity}`);

  return (
    <Button
      icon={
        <>
          <Badge
            key={key}
            className={`odf-alerts-panel__badge odf-alerts-panel__badge-${alertSeverity}`}
          >
            <StatusIconAndText title={alerts.length.toString()} icon={icon} />
          </Badge>
          <span className="odf-alerts-panel__badge-text">
            {_.startCase(alertSeverity)}
          </span>
        </>
      }
      variant={ButtonVariant.plain}
      isInline
      onClick={onClick}
      className="odf-alerts-panel__button"
    />
  );
};

type AlertAccordionItemProps = {
  alerts: React.ComponentProps<typeof AlertItem>['alert'][];
  alertSeverity: AlertSeverity;
  expanded: string;
  loaded: boolean;
  loadError: object;
  onToggle: Function;
  AlertItemComponent?: React.FC<React.ComponentProps<typeof AlertItem>>;
};

const AlertAccordionItem: React.FC<AlertAccordionItemProps> = ({
  alerts,
  alertSeverity,
  expanded,
  loaded,
  loadError,
  onToggle,
  AlertItemComponent = AlertItem,
}) => {
  const { t } = useCustomTranslation();
  const alertToggleId = `alert-toggle-${alertSeverity}`;
  const alertExpandId = `alert-expand-${alertSeverity}`;
  return (
    <AccordionItem isExpanded={expanded === alertToggleId}>
      <AccordionToggle
        onClick={() => onToggle(alertToggleId)}
        id={alertToggleId}
      >
        {`${_.startCase(alertSeverity)} alerts`}
      </AccordionToggle>
      <AccordionContent id={alertExpandId}>
        {alerts.length === 0 && !loadError ? (
          <div className="centerComponent">
            <div className="text-muted">
              {t('No {{alertSeverity}} alerts found', { alertSeverity })}
            </div>
          </div>
        ) : (
          <AlertsBody error={!_.isEmpty(loadError)}>
            {loaded &&
              alerts.length > 0 &&
              alerts.map((alert) => (
                <AlertItemComponent key={alert?.rule?.id} alert={alert} />
              ))}
          </AlertsBody>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};

type AlertsProps = {
  alerts: Alert[];
  alertsFilter?: (alert: Alert) => boolean;
  className?: string;
  AlertItemComponent?: React.FC<React.ComponentProps<typeof AlertItem>>;
  titleToolTip?: JSX.Element | string;
  loaded: boolean;
  loadError: object;
};

const AlertsPanel: React.FC<AlertsProps> = ({
  alerts,
  alertsFilter,
  className,
  AlertItemComponent,
  titleToolTip,
  loaded,
  loadError,
}) => {
  const { t } = useCustomTranslation();
  const [expanded, setExpanded] = React.useState('');
  const onToggle = (id: string) => {
    if (id === expanded) {
      setExpanded('');
    } else {
      setExpanded(id);
    }
  };
  const filteredAlerts =
    loaded && !loadError && !_.isEmpty(alerts)
      ? alertsFilter
        ? alerts.filter(alertsFilter)
        : alerts
      : [];
  const [criticalAlerts, warningAlerts, infoAlerts] = [[], [], []];
  filteredAlerts.forEach((alert: Alert) => {
    switch (getAlertSeverity(alert)) {
      case AlertSeverity.Critical:
        criticalAlerts.push(alert);
        break;
      case AlertSeverity.Warning:
        warningAlerts.push(alert);
        break;
      default:
        infoAlerts.push(alert);
    }
  });

  return (
    <div
      className={classNames('odf-m-pane__body', 'odf-alerts__panel', className)}
    >
      <Title headingLevel="h3">
        {t('Alerts')} ({filteredAlerts.length})
        {!!titleToolTip && <FieldLevelHelp>{titleToolTip}</FieldLevelHelp>}
      </Title>
      <Divider className="odf-alerts-panel__divider" />
      <AlertBadge
        alerts={criticalAlerts}
        alertSeverity={AlertSeverity.Critical}
        onToggle={onToggle}
      />
      <AlertBadge
        alerts={warningAlerts}
        alertSeverity={AlertSeverity.Warning}
        onToggle={onToggle}
      />
      <AlertBadge
        alerts={infoAlerts}
        alertSeverity={AlertSeverity.Info}
        onToggle={onToggle}
      />
      <Divider className="odf-alerts-panel__divider" />
      <Accordion asDefinitionList={false}>
        <AlertAccordionItem
          alerts={criticalAlerts}
          alertSeverity={AlertSeverity.Critical}
          onToggle={onToggle}
          expanded={expanded}
          loaded={loaded}
          loadError={loadError}
          AlertItemComponent={AlertItemComponent}
        />
        <AlertAccordionItem
          alerts={warningAlerts}
          alertSeverity={AlertSeverity.Warning}
          onToggle={onToggle}
          expanded={expanded}
          loaded={loaded}
          loadError={loadError}
          AlertItemComponent={AlertItemComponent}
        />
        <AlertAccordionItem
          alerts={infoAlerts}
          alertSeverity={AlertSeverity.Info}
          onToggle={onToggle}
          expanded={expanded}
          loaded={loaded}
          loadError={loadError}
          AlertItemComponent={AlertItemComponent}
        />
      </Accordion>
    </div>
  );
};

export default AlertsPanel;
