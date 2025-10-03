import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

export function useAuthInitializer() {
  const { token, user, refreshUser } = useAuth();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!token) {
        if (active) {
          setInitializing(false);
        }
        return;
      }
      if (user) {
        setInitializing(false);
        return;
      }
      await refreshUser();
      if (active) {
        setInitializing(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [token, user, refreshUser]);

  return initializing;
}
