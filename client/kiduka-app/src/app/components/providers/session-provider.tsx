// components/session-provider.tsx
"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"
import { AuthProvider } from "@/hooks/useAuth"

interface Props {
  children: ReactNode
}

export function Providers({ children }: Props) {
  return (
    <SessionProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SessionProvider>
  )
}