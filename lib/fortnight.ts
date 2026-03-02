export function getFortnightWindowForDate(reference: Date): { startDate: Date; endDate: Date } {
    // Use local calendar days so the displayed period
    // does not drift across months due to timezone offsets.
    const year = reference.getFullYear()
    const month = reference.getMonth()
    const day = reference.getDate()

    let startDay: number
    let endDay: number

    if (day <= 14) {
        startDay = 1
        endDay = 14
    } else if (day <= 28) {
        // Middle fortnight: 15–28 (always 14 days)
        startDay = 15
        endDay = 28
    } else {
        // Final fortnight: 29–end of month
        startDay = 29
        // Compute last day of the month in local time
        const lastDay = new Date(year, month + 1, 0).getDate()
        endDay = lastDay
    }

    // Construct local-midnight bounds; callers convert to ISO for DB queries.
    const startDate = new Date(year, month, startDay, 0, 0, 0, 0)
    const endDate = new Date(year, month, endDay, 23, 59, 59, 999)

    return { startDate, endDate }
}

