import * as React from 'react';

const useRefWidth = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number>();

  const setRef = React.useCallback((e: HTMLDivElement) => {
    const newWidth = e?.clientWidth;
    newWidth &&
      ref.current?.clientWidth !== newWidth &&
      setWidth(e.clientWidth);
    ref.current = e;
  }, []);

  React.useEffect(() => {
    const handleResize = () => setWidth(ref.current?.clientWidth);
    window.addEventListener('resize', handleResize);
    window.addEventListener('sidebar_toggle', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('sidebar_toggle', handleResize);
    };
  }, []);

  const clientWidth = ref.current?.clientWidth;

  React.useEffect(() => {
    width !== clientWidth && setWidth(clientWidth);
  }, [clientWidth, width]);

  return [setRef, width] as [React.Ref<HTMLDivElement>, number];
};

export default useRefWidth;
