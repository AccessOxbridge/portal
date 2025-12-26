import { ReactNode } from "react"

export type UserRoles = 'student' | 'mentor' | 'admin' | 'admin-dev'

export interface DashboardLayoutProps {
    children: ReactNode
    userRole: UserRoles
    userName?: string
  }
  