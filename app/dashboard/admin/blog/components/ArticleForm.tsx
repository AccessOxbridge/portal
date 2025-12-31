'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createArticle } from '../actions'
import { Database } from '@/utils/supabase/types'

type Article = Database['public']['Tables']['articles']['Row']

interface ArticleFormProps {
    author: string
    article?: Article
}

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
                    <label htmlFor="body" className="block text-sm font-bold text-gray-700 mb-2">
                        Article Content *
                    </label>
                    <textarea
                        id="body"
                        value={formData.body}
                        onChange={(e) => handleChange('body', e.target.value)}
                        rows={20}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent transition-colors font-mono text-sm"
                        placeholder="Write your article content here... (Markdown supported)"
                        disabled={isPending}
                    />
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
