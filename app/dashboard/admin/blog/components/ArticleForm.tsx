'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createArticle } from '../actions'
import { Database } from '@/utils/supabase/types'
import dynamic from 'next/dynamic'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '@uiw/react-md-editor/markdown-editor.css'

type Article = Database['public']['Tables']['articles']['Row']

interface ArticleFormProps {
    author: string
    article?: Article
}

// Dynamically import MDEditor to avoid SSR issues
const MDEditor = dynamic(
    () => import('@uiw/react-md-editor').then((mod) => mod.default),
    { ssr: false }
)

export function ArticleForm({ author, article }: ArticleFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [formData, setFormData] = useState({
        title: article?.title || '',
        description: article?.description || '',
        category: article?.category || 'Oxbridge Admissions',
        tags: article?.tags?.join(', ') || '',
        image: article?.image || '',
        featured: article?.featured || false,
        body: article?.body || '',
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

    const categories = [
        'Oxbridge Admissions',
        'Interview Tips',
        'Personal Statement',
        'UK Universities',
        'Student Stories'
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrors({})

        // Validate form
        const newErrors: Record<string, string> = {}
        if (!formData.title.trim()) newErrors.title = 'Title is required'
        if (!formData.description.trim()) newErrors.description = 'Description is required'
        if (!formData.body.trim()) newErrors.body = 'Content is required'
        if (!formData.image.trim()) newErrors.image = 'Image URL is required'

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        startTransition(async () => {
            try {
                const result = await createArticle({
                    ...formData,
                    author,
                    tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                    id: article?.id,
                })

                if (result.error) {
                    setErrors({ general: result.error })
                } else {
                    router.push('/dashboard/admin/blog')
                }
            } catch (error) {
                setErrors({ general: 'An unexpected error occurred' })
            }
        })
    }

    const handleChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <p className="text-red-700 font-medium">{errors.general}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Title */}
                <div className="md:col-span-2">
                    <label htmlFor="title" className="block text-sm font-bold text-gray-700 mb-2">
                        Article Title *
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                        placeholder="Enter an engaging title..."
                        disabled={isPending}
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                {/* Category */}
                <div>
                    <label htmlFor="category" className="block text-sm font-bold text-gray-700 mb-2">
                        Category *
                    </label>
                    <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                        disabled={isPending}
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Featured */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        Featured Article
                    </label>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={formData.featured}
                            onChange={(e) => handleChange('featured', e.target.checked)}
                            className="rounded border-gray-300 text-accent focus:ring-accent"
                            disabled={isPending}
                        />
                        <span className="ml-2 text-gray-600">Mark as featured</span>
                    </label>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-2">
                        Description *
                    </label>
                    <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                        placeholder="Brief description of the article..."
                        disabled={isPending}
                    />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>

                {/* Tags */}
                <div className="md:col-span-2">
                    <label htmlFor="tags" className="block text-sm font-bold text-gray-700 mb-2">
                        Tags
                    </label>
                    <input
                        type="text"
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => handleChange('tags', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                        placeholder="Enter tags separated by commas..."
                        disabled={isPending}
                    />
                    <p className="text-gray-500 text-sm mt-1">Separate multiple tags with commas</p>
                </div>

                {/* Image URL */}
                <div className="md:col-span-2">
                    <label htmlFor="image" className="block text-sm font-bold text-gray-700 mb-2">
                        Featured Image URL *
                    </label>
                    <input
                        type="url"
                        id="image"
                        value={formData.image}
                        onChange={(e) => handleChange('image', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                        placeholder="https://example.com/image.jpg"
                        disabled={isPending}
                    />
                    {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
                </div>

                {/* Content */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        Article Content *
                    </label>
                    
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab('edit')}
                            className={`px-6 py-3 font-medium text-sm transition-colors ${
                                activeTab === 'edit'
                                    ? 'border-b-2 border-accent text-accent'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            disabled={isPending}
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('preview')}
                            className={`px-6 py-3 font-medium text-sm transition-colors ${
                                activeTab === 'preview'
                                    ? 'border-b-2 border-accent text-accent'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            disabled={isPending}
                        >
                            Preview
                        </button>
                    </div>

                    {/* Editor/Preview Content */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden min-h-[500px]">
                        {activeTab === 'edit' ? (
                            <div data-color-mode="light">
                                <MDEditor
                                    value={formData.body}
                                    onChange={(value) => handleChange('body', value || '')}
                                    preview="edit"
                                    hideToolbar={false}
                                    textareaProps={{
                                        placeholder: 'Write your article content here using Markdown...',
                                        disabled: isPending,
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="p-6 overflow-auto max-h-[600px]">
                                {formData.body ? (
                                    <div className="markdown-preview">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                h1: ({ children }) => <h1 className="text-3xl font-bold text-gray-900 mb-4 mt-6 first:mt-0">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-2xl font-semibold text-gray-900 mb-3 mt-6">{children}</h2>,
                                                h3: ({ children }) => <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">{children}</h3>,
                                                p: ({ children }) => <p className="text-gray-700 leading-relaxed mb-4">{children}</p>,
                                                a: ({ href, children }) => (
                                                    <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
                                                        {children}
                                                    </a>
                                                ),
                                                code: ({ children, className }) => {
                                                    const isInline = !className
                                                    return isInline ? (
                                                        <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                                                    ) : (
                                                        <code className={className}>{children}</code>
                                                    )
                                                },
                                                pre: ({ children }) => (
                                                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                                                        {children}
                                                    </pre>
                                                ),
                                                ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700">{children}</ol>,
                                                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                                blockquote: ({ children }) => (
                                                    <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-4">
                                                        {children}
                                                    </blockquote>
                                                ),
                                                strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                                                em: ({ children }) => <em className="italic">{children}</em>,
                                                hr: () => <hr className="my-6 border-gray-300" />,
                                                table: ({ children }) => (
                                                    <div className="overflow-x-auto mb-4">
                                                        <table className="min-w-full border-collapse border border-gray-300">
                                                            {children}
                                                        </table>
                                                    </div>
                                                ),
                                                thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
                                                tbody: ({ children }) => <tbody>{children}</tbody>,
                                                tr: ({ children }) => <tr className="border-b border-gray-300">{children}</tr>,
                                                th: ({ children }) => <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">{children}</th>,
                                                td: ({ children }) => <td className="border border-gray-300 px-4 py-2 text-gray-700">{children}</td>,
                                            }}
                                        >
                                            {formData.body}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="text-gray-400 italic text-center py-20">
                                        Start writing to see the preview...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {errors.body && <p className="text-red-500 text-sm mt-1">{errors.body}</p>}
                </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-8 border-t border-gray-100">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    disabled={isPending}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-8 py-3 bg-accent text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-accent/40 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isPending ? 'Saving...' : (article ? 'Update Article' : 'Create Article')}
                </button>
            </div>
        </form>
    )
}
