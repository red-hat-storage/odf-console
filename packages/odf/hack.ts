import { useEffect } from 'react';

export const useDisableAndBoldOnFind = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      const target = document.querySelector('[data-test-odf]');
      console.log('interval called');
      if (target) {
        console.log('target found');
        // @ts-ignore
        target.style.fontWeight = 'bold';
        // @ts-ignore
        target.style.pointerEvents = 'none';
        // @ts-ignore
        target.style.cursor = 'default';
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval); // cleanup on unmount
  }, []);
};
