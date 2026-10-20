import * as React from 'react'
import { cn } from '@/utils/lib'
import { fieldBase } from '@/components/ui/input'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(fieldBase, 'min-h-24 px-3.5 py-2.5 leading-relaxed in-data-[density=compact]:px-3 in-data-[density=compact]:py-2', className)}
            {...props}
        />
    )
}

export { Textarea }
