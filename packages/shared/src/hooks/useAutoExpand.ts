import * as React from 'react';

const useAutoExpand = () => {
  const ref = React.useRef(null);
  const [height, setHeight] = React.useState(0);

  const updateHeight = () => {
    if (ref.current) {
      const windowHeight = window.innerHeight;
      const divTopOffset = ref.current.getBoundingClientRect().top;
      const availableHeight = windowHeight - divTopOffset;
      setHeight(availableHeight);
    }
  };

  React.useEffect(() => {
    updateHeight(); // Set initial height on mount

    const handleResize = () => {
      updateHeight(); // Update height on window resize
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize); // Clean up on unmount
    };
  }, []);

  return { ref, height };
};

export default useAutoExpand;
