import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
    title: 'Portal Under Maintenance | Access Oxbridge',
    description: 'The Access Oxbridge portal is temporarily down for scheduled maintenance.',
    robots: { index: false, follow: false },
}

export default function MaintenancePage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-[#092c68] px-6 py-16 text-center text-white">
            <div className="w-full max-w-md">
                <Image
                    src="/logo.webp"
                    alt="Access Oxbridge"
                    width={180}
                    height={48}
                    priority
                    className="mx-auto mb-10 h-auto w-44"
                />

                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Portal under maintenance
                </h1>

                <p className="mt-5 text-base leading-relaxed text-white/80">
                    We&apos;re carrying out scheduled maintenance to improve the portal. Access will
                    be restored by <span className="font-semibold text-white">8&nbsp;am BST</span>.
                    Thank you for your patience.
                </p>

                <p className="mt-8 text-sm text-white/60">
                    Payments and scheduled tasks continue to run normally in the background. If you
                    need urgent help, please contact{' '}
                    <a
                        href="mailto:office@accessoxbridge.io"
                        className="font-medium text-[#ffb81d] underline underline-offset-4 hover:text-[#ffca4d]"
                    >
                        office@accessoxbridge.io
                    </a>
                    .
                </p>
            </div>
        </main>
    )
}
