import * as React from 'react';
import {
  ObjectLockRetention,
  ObjectLockRetentionMode,
} from '@aws-sdk/client-s3';
import { getRetentionPeriodDetails, RetentionPeriodUnit } from '@odf/shared/s3';
import * as _ from 'lodash-es';

export type RetentionFormState = {
  mode: ObjectLockRetentionMode;
  period: number;
  periodUnit: RetentionPeriodUnit;
};

export const retentionInitialState: RetentionFormState = {
  mode: ObjectLockRetentionMode.GOVERNANCE,
  period: 0,
  periodUnit: RetentionPeriodUnit.DAYS,
};

export const convertRetentionToFormState = (
  retention: ObjectLockRetention
): RetentionFormState => {
  if (_.isEmpty(retention)) return { ...retentionInitialState };

  const { period, unit } = getRetentionPeriodDetails(retention.RetainUntilDate);

  return {
    mode: retention.Mode ?? retentionInitialState.mode,
    period: period ?? retentionInitialState.period,
    periodUnit: unit ?? retentionInitialState.periodUnit,
  };
};

type UseEditObjectRetention = ({
  existingRetention,
  dispatch,
}: {
  existingRetention: ObjectLockRetention;
  dispatch: (state: RetentionFormState) => void;
}) => void;

/**
 * Seeds the retention form from the object's existing retention (edit case).
 *
 * The same form is used to set retention for the first time (create) and to
 * extend an existing one (edit), so seeding must happen exactly once: the
 * retention is fetched asynchronously, and SWR keeps revalidating it in the
 * background. Without the ref guard, any revalidation would overwrite edits
 * already made by the user. The retention period is also derived relative to
 * "now", so re-running the effect can silently change it as time passes.
 */
export const useEditObjectRetention: UseEditObjectRetention = ({
  existingRetention,
  dispatch,
}) => {
  const editRef = React.useRef(true);
  React.useEffect(() => {
    if (editRef.current && !_.isEmpty(existingRetention)) {
      editRef.current = false;
      dispatch(convertRetentionToFormState(existingRetention));
    }
  }, [existingRetention, dispatch]);
};
