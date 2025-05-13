import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

export function createGlobalState<T>(defaultData: T | null = null) {
  return function (
    queryKey: unknown,
    initialData: T | null = null,
    props?: Partial<UseQueryOptions<T | null, Error, T | null, unknown[]>>
  ) {
    const queryClient = useQueryClient();

    const { data } = useQuery({
      queryKey: [queryKey],
      queryFn: () => Promise.resolve(initialData ?? defaultData),
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchIntervalInBackground: false,
      ...props,
    });

    function setData(newData: Partial<T>) {
      queryClient.setQueryData([queryKey], newData);
    }

    function resetData() {
      queryClient.invalidateQueries({
        queryKey: [queryKey],
      });
      queryClient.refetchQueries({
        queryKey: [queryKey],
      });
    }

    return { data, setData, resetData };
  };
}
