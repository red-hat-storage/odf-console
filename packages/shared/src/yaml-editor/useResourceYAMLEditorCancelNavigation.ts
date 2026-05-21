import * as React from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

/**
 * Intercepts clicks on the core console YAML editor cancel button (#cancel)
 * and navigates back instead of the default behavior.
 */
export const useResourceYAMLEditorCancelNavigation = (): void => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('#cancel')) {
        event.preventDefault();
        event.stopPropagation();
        navigate(-1);
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [navigate]);
};
