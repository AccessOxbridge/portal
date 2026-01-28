'use client'

export function StripeDashboardButton() {
    const handleClick = async () => {
        const res = await fetch('/api/stripe/connect/dashboard')
        if (res.ok) {
            const { url } = await res.json()
            window.open(url, '_blank')
        }
    }

    return (
        <button
            onClick={handleClick}
            className="px-6 py-3 bg-white text-[#635BFF] font-bold rounded-xl hover:bg-gray-50 transition-colors"
        >
            Open Dashboard →
        </button>
    )
} 
