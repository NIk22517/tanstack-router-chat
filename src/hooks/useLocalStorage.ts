import { useCallback } from "react";

type KeyType = "auth";

type LocalStorageMap = {
  auth: AuthType;
};

export type AuthType = {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  token: string;
};

export function useLocalStorage<K extends KeyType>(key: K) {
  const getItem = useCallback((): LocalStorageMap[K] | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as LocalStorageMap[K]) : null;
    } catch (error) {
      console.error("Error getting localStorage item", error);
      return null;
    }
  }, [key]);

  const setItem = useCallback(
    (value: LocalStorageMap[K]): void => {
      try {
        const stringifiedValue = JSON.stringify(value);
        localStorage.setItem(key, stringifiedValue);
      } catch (error) {
        console.error("Error setting localStorage item", error);
      }
    },
    [key]
  );

  const removeItem = useCallback((): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing localStorage item", error);
    }
  }, [key]);

  return { getItem, setItem, removeItem };
}
