import { notFound } from 'next/navigation'
import HomeOptions from './home-options'

/**
 * /dashboard/ui-preview/home: development only.
 *
 * Three directions for the student home, built with the real components and
 * sample data so they can be compared at full desktop width. Each uses only
 * what the home already loads. 404s in a production build; touches no data.
 */
export default function HomeOptionsPage() {
    if (process.env.NODE_ENV === 'production') notFound()

    return <HomeOptions />
}
