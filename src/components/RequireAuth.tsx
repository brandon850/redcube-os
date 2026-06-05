import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/AppLayout'

export default function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <AppLayout />
}
