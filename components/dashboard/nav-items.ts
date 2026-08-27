import {
    LayoutDashboard,
    Users,
    Calendar,
    CreditCard,
    FileText,
    CheckCircle,
    PenBoxIcon,
    Coins,
    Banknote,
    MessageSquare,
    MessageCircle,
    Video,
    ClipboardList,
    Home,
    Briefcase,
    GraduationCap,
    AlertCircle,
    HelpCircle,
    User,
    UserPlus,
    CalendarDays,
    CalendarRange,
    BookOpen,
    Film,
} from 'lucide-react'

export interface NavItem {
    name: string
    href: string
    icon: React.ElementType
}

// Section type for expandable sidebar sections
export interface NavSection {
    name: string
    icon: React.ElementType
    subsections: NavItem[]
}

export const studentSections: NavSection[] = [
    // Hidden from student sidebar view
    // {
    //     name: 'Events',
    //     icon: CalendarDays,
    //     subsections: [
    //         { name: 'Webinars', href: '/dashboard/student/events/webinars', icon: Video },
    //         { name: 'In Person Events', href: '/dashboard/student/events/in-person', icon: MapPin },
    //     ],
    // },
]

const adminNav: NavItem[] = [
    { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
    { name: 'Approvals', href: '/dashboard/admin/approvals', icon: CheckCircle },
    { name: 'Mentors', href: '/dashboard/admin/mentors', icon: Users },
    { name: 'Students', href: '/dashboard/admin/students', icon: BookOpen },
    { name: 'Create Account', href: '/dashboard/admin/create-account', icon: UserPlus },
    { name: 'Student Help', href: '/dashboard/admin/student-help', icon: HelpCircle },
    { name: 'Events', href: '/dashboard/admin/events', icon: CalendarDays },
    { name: 'Products', href: '/dashboard/admin/products', icon: Coins },
    { name: 'Sessions', href: '/dashboard/admin/sessions', icon: Video },
    { name: 'Manage Sessions', href: '/dashboard/admin/manage-sessions', icon: CalendarRange },
    { name: 'Session Payouts', href: '/dashboard/admin/session-payouts', icon: Banknote },
    { name: 'Session Recordings', href: '/dashboard/admin/recordings', icon: Film },
    { name: 'Feedback', href: '/dashboard/admin/feedbacks', icon: MessageSquare },
    { name: 'Messages', href: '/dashboard/admin/messages', icon: MessageCircle },
    { name: 'Blog', href: '/dashboard/admin/blog', icon: PenBoxIcon },
    { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
    { name: 'Fortnightly Report', href: '/dashboard/admin/fortnightly-report', icon: CalendarRange },
    { name: 'Transactions', href: '/dashboard/admin/transactions', icon: CreditCard },
    { name: 'Payouts', href: '/dashboard/admin/payouts', icon: Banknote },
    { name: 'Issues', href: '/dashboard/admin/issues', icon: AlertCircle },
    { name: 'Legal', href: '/dashboard/admin/legal', icon: Briefcase },
]

export const navigation: Record<string, NavItem[]> = {
    student: [
        { name: 'Home', href: '/dashboard/student', icon: Home },
        { name: 'My Sessions', href: '/dashboard/student/sessions', icon: Calendar },
        { name: 'Recordings', href: '/dashboard/student/recordings', icon: Film },
        { name: 'Messages', href: '/dashboard/student/messages', icon: MessageCircle },
        { name: 'My Mentors', href: '/dashboard/student/mentors', icon: Users },
        { name: 'Reports', href: '/dashboard/student/reports', icon: FileText },
        // Hidden from student sidebar view
        // { name: 'Resources', href: '/dashboard/student/resources', icon: Book },
    ],
    mentor: [
        { name: 'Training', href: '/dashboard/mentor/training', icon: GraduationCap },
        { name: 'Dashboard', href: '/dashboard/mentor', icon: LayoutDashboard },
        { name: 'Messages', href: '/dashboard/mentor/messages', icon: MessageCircle },
        { name: 'Sessions', href: '/dashboard/mentor/sessions', icon: Calendar },
        { name: 'My Students', href: '/dashboard/mentor/students', icon: Users },
        { name: 'Requests', href: '/dashboard/mentor/requests', icon: ClipboardList },
        { name: 'Reports', href: '/dashboard/mentor/reports', icon: FileText },
        { name: 'Payouts', href: '/dashboard/mentor/payouts', icon: Banknote },
        { name: 'Availability', href: '/dashboard/mentor/availability', icon: CheckCircle },
        { name: 'My Profile', href: '/dashboard/mentor/profile', icon: User },
    ],
    admin: adminNav,
    'admin-dev': adminNav, // Same as admin for now
}

/**
 * Names of the nav items pinned to the mobile bottom tab bar, in display order.
 * Everything else for the role goes into the "More" sheet. Names must match the
 * `navigation` entries above.
 */
export const MOBILE_TAB_NAMES: Record<string, string[]> = {
    student: ['Home', 'My Sessions', 'Messages', 'My Mentors'],
    mentor: ['Dashboard', 'Sessions', 'Requests', 'Messages'],
}

/** Shorter labels so the tab bar fits five items across a 375px screen. */
export const MOBILE_TAB_LABELS: Record<string, string> = {
    'My Sessions': 'Sessions',
    'My Mentors': 'Mentors',
    'My Profile': 'Profile',
}
