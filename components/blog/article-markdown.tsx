import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function ArticleMarkdown({ body }: { body: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h1: ({ children }) => (
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-8 tracking-tight">{children}</h1>
                ),
                h2: ({ children }) => (
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-10">{children}</h2>
                ),
                h3: ({ children }) => (
                    <h3 className="text-xl font-bold text-gray-900 mb-3 mt-8">{children}</h3>
                ),
                p: ({ children }) => (
                    <p className="text-gray-600 leading-loose mb-6 text-lg">{children}</p>
                ),
                li: ({ children }) => (
                    <li className="text-gray-600 leading-relaxed mb-2 text-lg">{children}</li>
                ),
                ul: ({ children }) => <ul className="list-disc pl-6 mb-6 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mb-6 space-y-1">{children}</ol>,
                a: ({ children, href }) => (
                    <a href={href} className="text-accent font-semibold underline hover:text-accent/80" target="_blank" rel="noopener noreferrer">
                        {children}
                    </a>
                ),
                blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-accent bg-accent/5 px-8 py-6 italic text-gray-700 rounded-r-2xl my-8 text-xl">
                        {children}
                    </blockquote>
                ),
            }}
        >
            {body}
        </ReactMarkdown>
    )
}
