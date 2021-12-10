import * as React from 'react';

const useRefWidth = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number>();

  const clientWidth = ref?.current?.clientWidth;

  React.useEffect(() => {
    const handleResize = () => setWidth(ref?.current?.clientWidth);
    window.addEventListener('resize', handleResize);
    window.addEventListener('sidebar_toggle', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('sidebar_toggle', handleResize);
    };
  }, []);

  React.useEffect(() => {
    setWidth(clientWidth);
  }, [clientWidth]);

  // eslint-disable-next-line no-undef
  return [ref, width] as [React.MutableRefObject<HTMLDivElement>, number];
};

export default useRefWidth;
