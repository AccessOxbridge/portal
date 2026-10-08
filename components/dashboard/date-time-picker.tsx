'use client'

import DatePicker from '@/components/dashboard/date-picker'
import SelectMenu from '@/components/dashboard/select-menu'

/** Times on a 15-minute grid, 00:00 to 23:45. */
const TIMES = Array.from({ length: 96 }, (_, i) => {
    const h = String(Math.floor(i / 4)).padStart(2, '0')
    const m = String((i % 4) * 15).padStart(2, '0')
    return `${h}:${m}`
})

/**
 * A drop-in for <input type="datetime-local">: the same value format
 * ("YYYY-MM-DDTHH:mm", or '' when empty) in and out, so whatever saves the
 * value is unchanged. Picking a date before a time uses 09:00; a saved time
 * that isn't on the 15-minute grid stays selectable.
 */
export default function DateTimePicker({
    value,
    onChange,
    min,
    id,
}: {
    value: string
    onChange: (value: string) => void
    /** Earliest selectable date as YYYY-MM-DD */
    min?: string
    id?: string
}) {
    const date = value ? value.slice(0, 10) : ''
    const time = value ? value.slice(11, 16) : ''
    const options = (time && !TIMES.includes(time) ? [...TIMES, time].sort() : TIMES).map((t) => ({ value: t, label: t }))

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
            <DatePicker id={id} value={date} min={min} onChange={(d) => onChange(`${d}T${time || '09:00'}`)} />
            <SelectMenu
                value={time}
                onChange={(t) => date && onChange(`${date}T${t}`)}
                options={options}
                placeholder="Time"
                disabled={!date}
                maxHeight={240}
            />
        </div>
    )
}
