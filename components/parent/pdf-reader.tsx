'use client'

import { useEffect, useRef, useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react/ssr'
import { Spinner } from '@/components/ui/spinner'

/** Copied from pdfjs-dist/legacy/build at the pinned version in package.json. */
const WORKER_SRC = '/pdfjs/pdf.worker.min.mjs'

/**
 * A PDF drawn page by page into the portal with pdf.js, so it reads the same
 * on every browser, including phones that won't show PDFs inline. Pages fill
 * the reader's width and are drawn sharp for the screen's pixel density.
 */
export function PdfReader({ url, title }: { url: string; title: string }) {
    const pagesRef = useRef<HTMLDivElement>(null)
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

    useEffect(() => {
        let cancelled = false
        let destroy: (() => void) | undefined
        ;(async () => {
            try {
                const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
                pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC
                const task = pdfjs.getDocument({ url })
                destroy = () => task.destroy()
                const pdf = await task.promise
                const host = pagesRef.current
                if (cancelled || !host) return
                host.replaceChildren()
                const width = host.clientWidth
                const ratio = window.devicePixelRatio || 1
                for (let n = 1; n <= pdf.numPages; n++) {
                    const page = await pdf.getPage(n)
                    if (cancelled) return
                    const base = page.getViewport({ scale: 1 })
                    const viewport = page.getViewport({ scale: (width / base.width) * ratio })
                    const canvas = document.createElement('canvas')
                    canvas.width = Math.floor(viewport.width)
                    canvas.height = Math.floor(viewport.height)
                    canvas.className = 'block h-auto w-full rounded-control bg-white shadow-border'
                    canvas.setAttribute('role', 'img')
                    canvas.setAttribute('aria-label', `${title}, page ${n} of ${pdf.numPages}`)
                    host.appendChild(canvas)
                    await page.render({ canvas, viewport }).promise
                    if (n === 1 && !cancelled) setState('ready')
                }
            } catch (e) {
                console.error('[pdf-reader]', e)
                if (!cancelled) setState('error')
            }
        })()
        return () => {
            cancelled = true
            destroy?.()
        }
    }, [url, title])

    return (
        <div>
            {state === 'loading' && (
                <div className="grid h-64 place-items-center text-muted-foreground">
                    <Spinner />
                </div>
            )}
            {state === 'error' && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                    This document couldn’t be shown here.{' '}
                    <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline-offset-4 hover:underline">
                        Open it in a new tab
                    </a>
                    .
                </p>
            )}
            <div ref={pagesRef} className="space-y-4" />
            {state === 'ready' && (
                <p className="mt-4 text-center">
                    <a href={url} download className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                        <DownloadSimple className="size-4" />
                        Download PDF
                    </a>
                </p>
            )}
        </div>
    )
}
