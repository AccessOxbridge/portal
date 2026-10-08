'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createArticle } from '../actions'
import { Database } from '@/utils/supabase/types'
import dynamic from 'next/dynamic'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '@uiw/react-md-editor/markdown-editor.css'
import { XCircle, ShieldWarning as ShieldAlert, Clock, ShieldCheck } from '@phosphor-icons/react/ssr'

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
        categories: (article?.categories as string[]) || ['Oxbridge Admissions'],
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
        'Student Stories',
        'Admissions Guide'
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

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-10 max-w-5xl mx-auto pb-8">
            {errors.general && (
                <div className="bg-tint-rose border border-border rounded-card p-4 flex items-center gap-3">
                    <XCircle className="size-5 text-destructive" />
                    <p className="text-tint-rose-foreground text-sm font-medium">{errors.general}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                {/* Main Content Area */}
                <div className="md:col-span-2 space-y-10">
                    {/* Title & Slug Info */}
                    <div className="space-y-4">
                        <label htmlFor="title" className="block text-sm font-semibold text-foreground ml-1">
                            Article title
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                            placeholder="e.g. How to Ace Your Oxford Interview"
                            disabled={isPending}
                        />
                        {errors.title && <p className="text-destructive text-xs font-medium ml-1">{errors.title}</p>}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-muted/60 p-8 rounded-card border border-border">
                        <div className="md:col-span-2 space-y-4">
                            <label className="block text-sm font-semibold text-foreground ml-1">
                                Categories
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {categories.map((cat) => {
                                    const isSelected = formData.categories.includes(cat)
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => {
                                                const newCategories = isSelected
                                                    ? formData.categories.filter(c => c !== cat)
                                                    : [...formData.categories, cat]
                                                if (newCategories.length > 0) {
                                                    handleChange('categories', newCategories)
                                                }
                                            }}
                                            className={`px-4 py-2 rounded-full text-xs font-semibold transition-[background-color,box-shadow,color] duration-150 border ${isSelected
                                                ? 'bg-primary text-white border-primary shadow-border shadow-primary/20'
                                                : 'bg-card text-muted-foreground border-border hover:border-primary/30'
                                                }`}
                                            disabled={isPending}
                                        >
                                            {cat}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-semibold text-foreground ml-1">
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
                                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-[background-color,box-shadow,color] duration-150 peer-checked:bg-primary"></div>
                                    <span className="ml-3 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Featured article</span>
                                </label>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <label htmlFor="description" className="block text-sm font-semibold text-foreground ml-1">
                                Short summary
                            </label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                rows={2}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm py-2.5 px-3.5 leading-relaxed resize-none"
                                placeholder="A brief hook to get readers interested..."
                                disabled={isPending}
                            />
                            {errors.description && <p className="text-destructive text-xs font-medium ml-1">{errors.description}</p>}
                        </div>

                        <div className="space-y-4">
                            <label htmlFor="tags" className="block text-sm font-semibold text-foreground ml-1">
                                Tags
                            </label>
                            <input
                                type="text"
                                id="tags"
                                value={formData.tags}
                                onChange={(e) => handleChange('tags', e.target.value)}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                                placeholder="interview, oxford, tips"
                                disabled={isPending}
                            />
                        </div>

                        <div className="space-y-4">
                            <label htmlFor="image" className="block text-sm font-semibold text-foreground ml-1">
                                Cover image URL
                            </label>
                            <input
                                type="url"
                                id="image"
                                value={formData.image}
                                onChange={(e) => handleChange('image', e.target.value)}
                                className="w-full min-w-0 rounded-control border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 in-data-[density=compact]:sm:text-sm h-11 in-data-[density=compact]:h-9 px-3.5"
                                placeholder="https://unsplash.com/..."
                                disabled={isPending}
                            />
                            {errors.image && <p className="text-destructive text-xs font-medium ml-1">{errors.image}</p>}
                        </div>
                    </div>

                    {/* Content Editor */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <label className="block text-sm font-semibold text-foreground">
                                Article content
                            </label>
                            <div className="flex bg-muted p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('edit')}
                                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-[background-color,box-shadow,color] duration-150 ${activeTab === 'edit'
                                        ? 'bg-card text-foreground shadow-border'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    disabled={isPending}
                                >
                                    Write
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('preview')}
                                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-[background-color,box-shadow,color] duration-150 ${activeTab === 'preview'
                                        ? 'bg-card text-foreground shadow-border'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    disabled={isPending}
                                >
                                    Preview
                                </button>
                            </div>
                        </div>

                        <div className="border border-transparent bg-card rounded-card overflow-hidden focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5 transition-[background-color,box-shadow,color] duration-150 shadow-border min-h-[600px] flex flex-col">
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
                                                h1: ({ children }) => <h1 className="text-4xl font-semibold text-foreground mb-8 tracking-tight">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-2xl font-semibold text-foreground mb-4 mt-10">{children}</h2>,
                                                h3: ({ children }) => <h3 className="text-xl font-semibold text-foreground mb-3 mt-8">{children}</h3>,
                                                p: ({ children }) => <p className="text-muted-foreground leading-loose mb-6 text-lg">{children}</p>,
                                                li: ({ children }) => <li className="text-muted-foreground leading-relaxed mb-2 text-lg">{children}</li>,
                                                blockquote: ({ children }) => (
                                                    <blockquote className="border-l-4 border-primary bg-primary/5 px-8 py-6 italic text-foreground rounded-r-2xl my-8 text-xl">
                                                        {children}
                                                    </blockquote>
                                                ),
                                            }}
                                        >
                                            {formData.body}
                                        </ReactMarkdown>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic py-32">
                                            <div className="size-16 bg-muted/60 rounded-full flex items-center justify-center mb-4">
                                                <ShieldAlert className="size-8 text-muted-foreground/60" />
                                            </div>
                                            Nothing to preview yet
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {errors.body && <p className="text-destructive text-xs font-semibold ml-1">{errors.body}</p>}
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isPending}
                    className={`px-8 py-3 bg-primary text-white rounded-control font-semibold hover:shadow-border hover:shadow-primary/40 transition-[background-color,box-shadow,color] duration-150 flex items-center gap-2 ${isPending ? 'opacity-70 scale-95' : 'hover:-translate-y-1'}`}
                >
                    {isPending ? (
                        <>
                            <Clock className="size-4 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="size-4" />
                            <span>{article ? 'Update Article' : 'Publish Article'}</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}
