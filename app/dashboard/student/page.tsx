import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SearchFilters from './search-filters'

interface SearchParams {
    page?: string;
    search?: string;
    expertise?: string;
}

export default async function StudentDashboard({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const search = params.search || '';
    const expertiseFilter = params.expertise || '';
    const pageSize = 8;
    const offset = (page - 1) * pageSize;

    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'student' && profile.role !== 'admin-dev')) {
        return redirect('/dashboard')
    }

    // Fetch mentors with profiles and count
    let query = supabase
        .from('mentors')
        .select(`
            id,
            bio,
            expertise,
            profiles (
                full_name
            )
        `, { count: 'exact' })
        .eq('is_active', true)

    if (search) {
        query = query.ilike('profiles.full_name', `%${search}%`)
    }

    if (expertiseFilter) {
        query = query.contains('expertise', [expertiseFilter])
    }

    const { data: mentors, count } = await query
        .range(offset, offset + pageSize - 1)
        .order('created_at', { ascending: false })

    const totalPages = Math.ceil((count || 0) / pageSize);

    // Get all unique expertise for filter dropdown
    // Fallback if RPC doesn't exist yet
    const expertises = [
        'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
        'Economics', 'History', 'English Literature', 'Law', 'Medicine'
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        Explore Mentors
                    </h1>
                    <p className="mt-2 text-gray-500 text-xl font-medium">Welcome back, {profile.full_name}! Find your perfect match.</p>
                </div>

                <SearchFilters expertises={expertises} />
            </header>

            {/* Mentor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {mentors?.map((mentor: any) => (
                    <div key={mentor.id} className="bg-white shadow-xl rounded-3xl border border-gray-100 hover:shadow-indigo-100 transition-all group overflow-hidden flex flex-col">
                        <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                        <div className="p-8 flex-grow">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                                <span className="text-2xl font-black text-indigo-600">{mentor.profiles.full_name[0]}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">{mentor.profiles.full_name}</h2>
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {mentor.expertise?.slice(0, 3).map((e: string) => (
                                    <span key={e} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-indigo-100">
                                        {e}
                                    </span>
                                ))}
                                {mentor.expertise?.length > 3 && (
                                    <span className="text-xs text-gray-400 font-medium">+{mentor.expertise.length - 3} more</span>
                                )}
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 mb-6">
                                {mentor.bio}
                            </p>
                        </div>
                        <div className="px-8 pb-8 pt-0 mt-auto">
                            <button className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all transform hover:-translate-y-1">
                                View Profile
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {(!mentors || mentors.length === 0) && (
                <div className="bg-white border-2 border-dashed border-gray-100 rounded-[40px] p-24 text-center">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-800">No mentors found</h2>
                    <p className="text-gray-500 mt-4 text-lg">Try adjusting your filters or search terms.</p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-16 flex justify-center items-center gap-4">
                    <Link
                        href={`?page=${page - 1}${search ? `&search=${search}` : ''}${expertiseFilter ? `&expertise=${expertiseFilter}` : ''}`}
                        className={`p-4 rounded-2xl border border-gray-100 bg-white shadow-sm transition-all ${page <= 1 ? 'opacity-30 pointer-events-none' : 'hover:shadow-indigo-100 hover:-translate-x-1'}`}
                    >
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>

                    <span className="text-gray-500 font-bold px-6 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        Page <span className="text-indigo-600">{page}</span> of {totalPages}
                    </span>

                    <Link
                        href={`?page=${page + 1}${search ? `&search=${search}` : ''}${expertiseFilter ? `&expertise=${expertiseFilter}` : ''}`}
                        className={`p-4 rounded-2xl border border-gray-100 bg-white shadow-sm transition-all ${page >= totalPages ? 'opacity-30 pointer-events-none' : 'hover:shadow-indigo-100 hover:translate-x-1'}`}
                    >
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            )}
        </div>
    )
}
