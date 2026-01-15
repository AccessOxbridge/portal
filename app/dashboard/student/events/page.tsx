'use client'

import Link from 'next/link'
import { Video, MapPin, ArrowRight, CalendarDays } from 'lucide-react'

export default function EventsPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Events</h1>
                <p className="text-gray-500 mt-1">
                    Discover webinars and in-person events to support your Oxbridge journey
                </p>
            </div>

            {/* Event Categories */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Webinars Card */}
                <Link
                    href="/dashboard/student/events/webinars"
                    className="group bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <Video className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Webinars</h2>
                            <p className="text-blue-100 text-sm">Online sessions</p>
                        </div>
                    </div>
                    <p className="text-blue-100 text-sm mb-4">
                        Join live online sessions with mentors, admissions experts, and current Oxbridge students from anywhere.
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
                        <span>View Webinars</span>
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </Link>

                {/* In Person Events Card */}
                <Link
                    href="/dashboard/student/events/in-person"
                    className="group bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl p-6 text-white hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <MapPin className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">In Person Events</h2>
                            <p className="text-rose-100 text-sm">Meet face-to-face</p>
                        </div>
                    </div>
                    <p className="text-rose-100 text-sm mb-4">
                        Attend exclusive networking events, campus tours, workshops, and mock interview days across the UK.
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
                        <span>View Events</span>
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-gray-600" />
                    Your Event Activity
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">3</div>
                        <div className="text-xs text-gray-500">Upcoming Webinars</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-rose-500">2</div>
                        <div className="text-xs text-gray-500">Upcoming Events</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">5</div>
                        <div className="text-xs text-gray-500">Events Attended</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">2</div>
                        <div className="text-xs text-gray-500">Recordings Available</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
