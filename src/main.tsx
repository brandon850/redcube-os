import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { AuthProvider } from '@/hooks/useAuth'
import { BrandProvider } from '@/hooks/useBrand'
import { Toaster } from '@/components/ui/sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Treat data as stale immediately so navigating to a page refetches current
      // data (e.g. a lead created by the audit flow shows on the pipeline without a
      // manual refresh). Cached data still renders instantly while it revalidates.
      staleTime: 0,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <BrandProvider>
            <App />
            <Toaster />
          </BrandProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
