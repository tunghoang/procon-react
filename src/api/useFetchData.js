import { useEffect, useState } from "react";
import { useApi } from "./useApi";

export function useFetchData({
  path,
  name,
  config,
  headers,
  onSuccess,
  onError,
  isFetch = true,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { apiGetAll } = useApi(path, name);

  useEffect(() => {
    isFetch && fetch();
    return () => {
      setData([]);
    };
  }, []);

  const fetch = async (params) => {
    try {
      load();
      const result = await apiGetAll(
        {
          ...config,
          params: {
            ...config?.params,
            ...params,
          },
        },
        headers
      );
      if (result) {
        setData(result);
        onSuccess && onSuccess(result);
      }
    } catch (error) {
      onError && onError(error);
    } finally {
      setLoading(false);
    }
  };

  const load = () => {
    setLoading(true);
  };

  const refetch = async (params) => {
    await fetch(params);
  };

  return { data, loading, refetch };
}
