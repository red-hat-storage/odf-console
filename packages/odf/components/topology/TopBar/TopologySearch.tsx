import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { ExpandIcon } from '@patternfly/react-icons';
import SearchBar from './SearchComponent';
import './TopologySearch.scss';

const TopologySearchBar: React.FC = () => {
  const [isFullScreen, setFullScreen] = React.useState(false);
  const { t } = useCustomTranslation();

  // Handles for when user exits full screen via `Esc` button
  React.useEffect(() => {
    const handler = () => {
      setFullScreen(!isFullScreen);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
    };
  }, [isFullScreen]);

  const toggleFullScreen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const element = document.getElementById('odf-topology');
    if (!isFullScreen) {
      element
        .requestFullscreen()
        // eslint-disable-next-line no-console
        .catch((error) => console.error(error));
    } else {
      document
        .exitFullscreen()
        // eslint-disable-next-line no-console
        .catch((error) => console.error(error));
    }
  };
  return (
    <div className="odf-topology-search-bar">
      <span className="odf-topology-search-bar__search">
        <SearchBar />
      </span>
      <span className="odf-topology-search-bar__expand">
        <Button
          icon={<ExpandIcon className="odf-topology-search-bar__expand-icon" />}
          variant={ButtonVariant.link}
          isInline
          onClick={toggleFullScreen}
          className="odf-topology-search-bar__expand-button"
        >
          {!isFullScreen ? t('Expand to fullscreen') : t('Exit fullscreen')}
        </Button>
      </span>
    </div>
  );
};

export default TopologySearchBar;
