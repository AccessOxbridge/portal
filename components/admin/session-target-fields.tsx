'use client'

import { CalendarDays, Hash, Repeat } from 'lucide-react'
import {
    describeTarget,
    MAX_TARGET_SESSIONS,
    MAX_TARGET_WEEKS,
    targetEndDate,
    type PlanType,
} from '@/lib/session-frequency'

export interface TargetDraft {
    planType: PlanType
    sessions: string
    weeks: string
    startDate: string
}

export function todayIso(): string {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const INPUT_CLASS =
    'w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/5 focus:border-accent/20 transition-all'
const LABEL_CLASS = 'text-sm font-bold text-gray-700 ml-1'

const PLAN_COPY: Record<PlanType, { label: string; hint: string }> = {
    package: { label: 'Package', hint: 'A fixed number of sessions over a set number of weeks.' },
    ongoing: { label: 'Ongoing', hint: 'Pays as they go, e.g. topped up weekly. Judged on the last 4 weeks.' },
}

/**
 * The plan type, sessions, weeks and start date for a student's session
 * target, with a live "≈ 1 session per week" line.
 *
 * Controlled, and every input carries a `name` (prefixed by `namePrefix`) so
 * a surrounding <form> can read the values through FormData.
 */
export function SessionTargetFields({
    value,
    onChange,
    namePrefix = 'target_',
    sessionsLocked = false,
    weeksRequired = true,
}: {
    value: TargetDraft
    onChange: (next: TargetDraft) => void
    namePrefix?: string
    /** Package sessions come from somewhere else (e.g. Total Hours) and are shown but not edited. */
    sessionsLocked?: boolean
    /** When false, leaving weeks blank means "no target". */
    weeksRequired?: boolean
}) {
    const sessions = Number(value.sessions)
    const weeks = Number(value.weeks)
    const valid = Number.isInteger(sessions) && sessions > 0 && weeks > 0 && /^\d{4}-\d{2}-\d{2}$/.test(value.startDate)
    const end = valid ? targetEndDate({ planType: value.planType, sessions, weeks, startDate: value.startDate }) : null
    const isPackage = value.planType === 'package'
    const lockSessions = sessionsLocked && isPackage

    return (
        <div className="space-y-4">
            <input type="hidden" name={`${namePrefix}plan_type`} value={value.planType} />
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 border border-gray-100 rounded-2xl">
                {(['package', 'ongoing'] as PlanType[]).map((type) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() =>
                            onChange({
                                ...value,
                                planType: type,
                                // Ongoing is almost always "N every week".
                                weeks: type === 'ongoing' && !value.weeks ? '1' : value.weeks,
                            })
                        }
                        className={`py-2 rounded-xl text-sm font-semibold transition-all ${
                            value.planType === type
                                ? 'bg-white text-accent shadow-sm border border-gray-100'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {PLAN_COPY[type].label}
                    </button>
                ))}
            </div>
            <p className="text-xs text-gray-500 -mt-2 ml-1">{PLAN_COPY[value.planType].hint}</p>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label className={LABEL_CLASS} htmlFor={`${namePrefix}sessions`}>
                        {isPackage ? 'Sessions in total' : 'Sessions'}
                    </label>
                    <div className="relative">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            id={`${namePrefix}sessions`}
                            name={`${namePrefix}sessions`}
                            type="number"
                            min={1}
                            max={MAX_TARGET_SESSIONS}
                            step={1}
                            value={value.sessions}
                            readOnly={lockSessions}
                            onChange={(e) => onChange({ ...value, sessions: e.target.value })}
                            className={`${INPUT_CLASS} ${lockSessions ? 'text-gray-500 cursor-not-allowed' : ''}`}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className={LABEL_CLASS} htmlFor={`${namePrefix}weeks`}>
                        {isPackage ? 'Over (weeks)' : 'Every (weeks)'}
                    </label>
                    <div className="relative">
                        <Repeat className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            id={`${namePrefix}weeks`}
                            name={`${namePrefix}weeks`}
                            type="number"
                            min={0.5}
                            max={MAX_TARGET_WEEKS}
                            step={0.5}
                            required={weeksRequired}
                            placeholder={weeksRequired ? undefined : 'Optional'}
                            value={value.weeks}
                            onChange={(e) => onChange({ ...value, weeks: e.target.value })}
                            className={INPUT_CLASS}
                        />
                    </div>
                </div>
            </div>
            {lockSessions && (
                <p className="text-xs text-gray-500 -mt-2 ml-1">Taken from Total Hours (1 hour = 1 session).</p>
            )}

            <div className="space-y-2">
                <label className={LABEL_CLASS} htmlFor={`${namePrefix}start_date`}>
                    Start date
                </label>
                <div className="relative">
                    <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        id={`${namePrefix}start_date`}
                        name={`${namePrefix}start_date`}
                        type="date"
                        required={weeksRequired}
                        value={value.startDate}
                        onChange={(e) => onChange({ ...value, startDate: e.target.value })}
                        className={INPUT_CLASS}
                    />
                </div>
            </div>

            {valid && (
                <div className="rounded-2xl bg-accent/5 border border-accent/10 px-4 py-3 text-sm text-gray-700">
                    <span className="font-semibold text-accent">
                        {describeTarget({ planType: value.planType, sessions, weeks })}
                    </span>
                    {end && (
                        <span className="text-gray-500">
                            {' '}
                            · ends{' '}
                            {end.toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                timeZone: 'UTC',
                            })}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
