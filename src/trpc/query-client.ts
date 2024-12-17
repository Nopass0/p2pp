import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
        //@ts-ignore
        cacheTime: 0, // Отключаем кеширование
      },
      // Не уверен, что это нужно, по крайней мере убрал ошибки ts
      // dehydrate: {
      //   serializeData: SuperJSON.serialize,
      //   shouldDehydrateQuery: (query) =>
      //     defaultShouldDehydrateQuery(query) ||
      //     query.state.status === "pending",
      // },
      // hydrate: {
      //   deserializeData: SuperJSON.deserialize,
      // },
    },
  });
