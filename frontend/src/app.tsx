import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function rootContainer(container: React.ReactNode) {
  return <QueryClientProvider client={queryClient}>{container}</QueryClientProvider>;
}
