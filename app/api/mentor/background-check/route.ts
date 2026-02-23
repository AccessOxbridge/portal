import { NextResponse } from 'next/server'
import { submitBackgroundCheck } from '../../../dashboard/mentor/training/actions'

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const result = await submitBackgroundCheck(formData)

        if (result?.error) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json(result)
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

