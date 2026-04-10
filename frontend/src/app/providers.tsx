'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,       // 30s cache
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: '10px',
            fontSize: '13px',
            border: '0.5px solid rgba(0,0,0,0.1)',
          },
          success: { iconTheme: { primary: '#1D9E75', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#E24B4A', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  )
}
