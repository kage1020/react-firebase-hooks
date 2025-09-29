import { useEffect, useState } from 'react';

const useIsMounted = () => {
  const [isMounted, setIsMounted] = useState(true);
  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);
  return isMounted;
};

export { useIsMounted };
