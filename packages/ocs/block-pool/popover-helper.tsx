import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { K8sKind, ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import {
  Button,
  Popover,
  PopoverProps,
  List,
  ListItem,
} from '@patternfly/react-core';

export const PopoverHelper: React.FC<PopoverHelperProps> = ({
  names,
  text,
  kind,
  popoverHasAutoWidth,
  testId,
}) => {
  const { t } = useCustomTranslation();

  const popOverBody = (
    <List isPlain>
      {names?.map((scName) => (
        <ListItem key={scName}>
          <ResourceLink kind={referenceForModel(kind)} name={scName} />
        </ListItem>
      ))}
    </List>
  );

  return (
    <>
      {names?.length ? (
        names?.length > 1 ? (
          <Popover
            aria-label={t('Help')}
            bodyContent={popOverBody}
            hasAutoWidth={popoverHasAutoWidth}
          >
            <Button
              aria-label={t('Help')}
              variant="link"
              isInline
              data-test-id={testId || null}
            >
              {`${names?.length} ${text}`}
            </Button>
          </Popover>
        ) : (
          <ResourceLink kind={referenceForModel(kind)} name={names?.[0]} />
        )
      ) : (
        '-'
      )}
    </>
  );
};

type PopoverHelperProps = {
  names: string[];
  text: string;
  kind: K8sKind;
  popoverHasAutoWidth?: PopoverProps['hasAutoWidth'];
  testId?: string;
};
