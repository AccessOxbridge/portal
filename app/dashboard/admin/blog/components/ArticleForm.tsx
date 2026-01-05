'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createArticle } from '../actions'
import { Database } from '@/utils/supabase/types'
import dynamic from 'next/dynamic'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '@uiw/react-md-editor/markdown-editor.css'
import { XCircle, ShieldAlert, Clock, ShieldCheck } from 'lucide-react'

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
        <form onSubmit={handleSubmit} className="space-y-10 max-w-5xl mx-auto pb-8">
            {errors.general && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <p className="text-red-700 text-sm font-medium">{errors.general}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                {/* Main Content Area */}
                <div className="md:col-span-2 space-y-10">
                    {/* Title & Slug Info */}
                    <div className="space-y-4">
                        <label htmlFor="title" className="block text-sm font-bold text-gray-900 ml-1">
                            Article Title
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className="w-full px-6 py-4 bg-white border border-gray-200 rounded-[20px] text-lg font-semibold text-gray-900 placeholder:text-gray-300 focus:ring-4 focus:ring-accent/5 focus:border-accent transition-all shadow-sm"
                            placeholder="e.g. How to Ace Your Oxford Interview"
                            disabled={isPending}
                        />
                        {errors.title && <p className="text-red-500 text-xs font-medium ml-1">{errors.title}</p>}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50/50 p-8 rounded-[32px] border border-gray-100">
                        <div className="space-y-4">
                            <label htmlFor="category" className="block text-sm font-bold text-gray-900 ml-1">
                                Category
                            </label>
                            <select
                                id="category"
                                value={formData.category}
                                onChange={(e) => handleChange('category', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-4 focus:ring-accent/5 focus:border-accent transition-all cursor-pointer shadow-sm"
                                disabled={isPending}
                            >
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-900 ml-1">
                                Visibility
                            </label>
                            <div className="flex items-center h-[46px]">
                                <label className="relative inline-flex items-center cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.featured}
                                        onChange={(e) => handleChange('featured', e.target.checked)}
                                        className="sr-only peer"
                                        disabled={isPending}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Featured Article</span>
                                </label>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <label htmlFor="description" className="block text-sm font-bold text-gray-900 ml-1">
                                Short Summary
                            </label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                rows={2}
                                className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl text-sm text-gray-600 placeholder:text-gray-300 focus:ring-4 focus:ring-accent/5 focus:border-accent transition-all shadow-sm resize-none"
                                placeholder="A brief hook to get readers interested..."
                                disabled={isPending}
                            />
                            {errors.description && <p className="text-red-500 text-xs font-medium ml-1">{errors.description}</p>}
                        </div>

                        <div className="space-y-4">
                            <label htmlFor="tags" className="block text-sm font-bold text-gray-900 ml-1">
                                Tags
                            </label>
                            <input
                                type="text"
                                id="tags"
                                value={formData.tags}
                                onChange={(e) => handleChange('tags', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 focus:ring-4 focus:ring-accent/5 focus:border-accent transition-all shadow-sm"
                                placeholder="interview, oxford, tips"
                                disabled={isPending}
                            />
                        </div>

                        <div className="space-y-4">
                            <label htmlFor="image" className="block text-sm font-bold text-gray-900 ml-1">
                                Cover Image URL
                            </label>
                            <input
                                type="url"
                                id="image"
                                value={formData.image}
                                onChange={(e) => handleChange('image', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 focus:ring-4 focus:ring-accent/5 focus:border-accent transition-all shadow-sm"
                                placeholder="https://unsplash.com/..."
                                disabled={isPending}
                            />
                            {errors.image && <p className="text-red-500 text-xs font-medium ml-1">{errors.image}</p>}
                        </div>
                    </div>

                    {/* Content Editor */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <label className="block text-sm font-bold text-gray-900">
                                Article Content
                            </label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('edit')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'edit'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    disabled={isPending}
                                >
                                    Write
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('preview')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'preview'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    disabled={isPending}
                                >
                                    Preview
                                </button>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-[24px] overflow-hidden focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/5 transition-all shadow-sm min-h-[600px] flex flex-col">
                            {activeTab === 'edit' ? (
                                <div data-color-mode="light" className="flex-1 flex flex-col">
                                    <MDEditor
                                        value={formData.body}
                                        onChange={(value) => handleChange('body', value || '')}
                                        preview="edit"
                                        hideToolbar={false}
                                        height="100%"
                                        className="flex-1 border-none! shadow-none!"
                                        textareaProps={{
                                            placeholder: 'Write your masterpiece here...',
                                            disabled: isPending,
                                        }}
                                    />
                                    <style jsx global>{`
                                        .w-md-editor { border: none !important; }
                                        .w-md-editor-toolbar { background: #F9FAFB !important; border-bottom: 1px solid #F3F4F6 !important; border-top-left-radius: 24px !important; border-top-right-radius: 24px !important; padding: 1rem !important; }
                                        .w-md-editor-content { background: white !important; }
                                    `}</style>
                                </div>
                            ) : (
                                <div className="p-10 max-w-none overflow-y-auto">
                                    {formData.body ? (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                h1: ({ children }) => <h1 className="text-4xl font-extrabold text-gray-900 mb-8 tracking-tight">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-10">{children}</h2>,
                                                h3: ({ children }) => <h3 className="text-xl font-bold text-gray-900 mb-3 mt-8">{children}</h3>,
                                                p: ({ children }) => <p className="text-gray-600 leading-loose mb-6 text-lg">{children}</p>,
                                                li: ({ children }) => <li className="text-gray-600 leading-relaxed mb-2 text-lg">{children}</li>,
                                                blockquote: ({ children }) => (
                                                    <blockquote className="border-l-4 border-accent bg-accent/5 px-8 py-6 italic text-gray-700 rounded-r-2xl my-8 text-xl">
                                                        {children}
                                                    </blockquote>
                                                ),
                                            }}
                                        >
                                            {formData.body}
                                        </ReactMarkdown>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 italic py-32">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                <ShieldAlert className="w-8 h-8 text-gray-200" />
                                            </div>
                                            Nothing to preview yet
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {errors.body && <p className="text-red-500 text-xs font-semibold ml-1">{errors.body}</p>}
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isPending}
                    className={`px-8 py-3 bg-accent text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-accent/40 transition-all flex items-center gap-2 ${isPending ? 'opacity-70 scale-95' : 'hover:-translate-y-1'}`}
                >
                    {isPending ? (
                        <>
                            <Clock className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>{article ? 'Update Article' : 'Publish Article'}</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}
