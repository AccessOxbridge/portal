'use server'

import { createClient } from '@/utils/supabase/server'
import { Database } from '@/utils/supabase/types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

interface CreateArticleData {
    title: string
    description: string
    category: string
    tags: string[]
    image: string
    featured: boolean
    body: string
    author: string
    id?: string
}

export async function createArticle(data: CreateArticleData) {
    try {
        const supabase = await createClient()

        // Check if user is admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: 'Unauthorized' }
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'admin' && profile.role !== 'admin-dev')) {
            return { error: 'Unauthorized' }
        }

        // Generate slug from title
        const slug = data.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()

        // Calculate reading time (words / 200)
        const words = data.body.split(/\s+/).length
        const readingTime = Math.ceil(words / 200)

        const articleData = {
            slug,
            title: data.title,
            description: data.description,
            author: data.author,
            category: data.category as Database['public']['Enums']['blog_category'],
            tags: data.tags,
            image: data.image,
            featured: data.featured,
            body: data.body,
            reading_time: readingTime,
            published_at: new Date().toISOString(),
        }

        let result
        if (data.id) {
            // Update existing article
            result = await supabase
                .from('articles')
                .update({
                    ...articleData,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', data.id)
                .select()
        } else {
            // Create new article
            result = await supabase
                .from('articles')
                .insert(articleData)
                .select()
        }

        if (result.error) {
            console.error('Database error:', result.error)
            return { error: 'Failed to save article. Please try again.' }
        }

        revalidatePath('/dashboard/admin/blog')
        revalidatePath('/blog')

        return { success: true, article: result.data[0] }
    } catch (error) {
        console.error('Server error:', error)
        return { error: 'An unexpected error occurred. Please try again.' }
    }
}
