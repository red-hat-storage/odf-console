import * as React from 'react';
import { screen, render } from '@testing-library/react';
import {
  ReviewAndCreateStep,
  ReviewAndCreationGroup,
  ReviewAndCreationItem,
} from './reviewAndCreateStep';

describe('Review and create step test', () => {
  test('Verify review and create step content', async () => {
    render(
      <ReviewAndCreateStep>
        <ReviewAndCreationGroup title="title-1">
          <ReviewAndCreationItem label="label-1:">
            value-1
          </ReviewAndCreationItem>
          <ReviewAndCreationItem label="label-2:">
            value-2
          </ReviewAndCreationItem>
        </ReviewAndCreationGroup>
        <ReviewAndCreationGroup title="title-2">
          <ReviewAndCreationItem label="label-3:">
            value-3
          </ReviewAndCreationItem>
          <ReviewAndCreationItem label="label-4:">
            value-4
          </ReviewAndCreationItem>
        </ReviewAndCreationGroup>
      </ReviewAndCreateStep>
    );
    expect(screen.getByText('title-1')).toBeInTheDocument();
    expect(screen.getByText('label-1:')).toBeInTheDocument();
    expect(screen.getByText('value-1')).toBeInTheDocument();
    expect(screen.getByText('label-2:')).toBeInTheDocument();
    expect(screen.getByText('value-2')).toBeInTheDocument();
    expect(screen.getByText('title-2')).toBeInTheDocument();
    expect(screen.getByText('label-3:')).toBeInTheDocument();
    expect(screen.getByText('value-3')).toBeInTheDocument();
    expect(screen.getByText('label-4:')).toBeInTheDocument();
    expect(screen.getByText('value-4')).toBeInTheDocument();
  });
});
