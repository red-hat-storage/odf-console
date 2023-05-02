import * as React from 'react';
import * as selectors from '@odf/shared/selectors';
import { fireEvent, render, screen } from '@testing-library/react';
import CreateNamespaceStore from './create-namespace-store';

const params = {
  ns: 'anyvalue',
};

jest.mock('@odf/shared/selectors', () => ({
  getName: jest.fn().mockReturnValue('test'),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => {
  return {
    ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
    useK8sWatchResource: jest.fn().mockReturnValue([[], false, false]),
  };
});

const historyMock = {
  location: {
    pathname: '',
  },
  goBack: () => {
    historyMock.location.pathname = '/testpath';
  },
  //push: () => jest.fn(),
};

jest.mock('react-router', () => {
  return {
    ...jest.requireActual('react-router'),
    useHistory: jest.fn().mockImplementation(() => historyMock),
  };
});

jest.mock('@odf/shared/hooks/useK8sList', () => ({
  __esModule: true,
  useK8sList: () => [
    [
      {
        metadata: {
          name: 'test',
        },
      },
    ],
    true,
    undefined,
  ],
}));

describe('CreateNamespaceStore test', () => {
  it('shows the correct heading texts', () => {
    const { container } = render(<CreateNamespaceStore match={{ params }} />);
    const heading = container.getElementsByClassName(
      'odf-create-operand__header-text'
    )[0];
    const titleHeading = container.getElementsByClassName('help-block')[0];
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/Create NamespaceStore/);
    expect(titleHeading).toBeInTheDocument();
    expect(titleHeading).toHaveTextContent(
      /Represents an underlying storage to be used as read or write target for the data in the namespace buckets\./
    );
  });

  it('Check the title size and heading level', () => {
    const { container } = render(<CreateNamespaceStore match={{ params }} />);
    const fontSize = container.getElementsByClassName('pf-m-2xl')[0];
    expect(fontSize).toBeInTheDocument();
    expect(
      container.querySelectorAll('h1.odf-create-operand__header-text')[0]
    ).toBeTruthy();
  });

  it('Check namespace store form class found', () => {
    const { container } = render(<CreateNamespaceStore match={{ params }} />);
    const nsStoreFormClass = container.getElementsByClassName(
      'nb-endpoints-page-form__short'
    )[0];
    expect(nsStoreFormClass).toBeInTheDocument();
  });

  it('Check onCancel and history', () => {
    render(<CreateNamespaceStore match={{ params }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(historyMock.location.pathname).toBe('/testpath');
  });

  it('test get name', () => {
    render(<CreateNamespaceStore match={{ params }} />);
    const getNameSpy = jest.spyOn(selectors, 'getName');
    expect(getNameSpy).toHaveBeenCalledWith({ metadata: { name: 'test' } });
  });
});
