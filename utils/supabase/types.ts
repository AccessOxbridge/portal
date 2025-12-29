export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            mentor_applications: {
                Row: {
                    created_at: string
                    cv_url: string | null
                    embedding: string | null
                    id: string
                    photo_url: string | null
                    responses: Json
                    status: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    cv_url?: string | null
                    embedding?: string | null
                    id?: string
                    photo_url?: string | null
                    responses: Json
                    status?: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    cv_url?: string | null
                    embedding?: string | null
                    id?: string
                    photo_url?: string | null
                    responses?: Json
                    status?: string
                    updated_at?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "mentor_applications_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            mentors: {
                Row: {
                    bio: string | null
                    created_at: string
                    cv_url: string | null
                    embedding: string | null
                    expertise: string[] | null
                    id: string
                    is_active: boolean | null
                    photo_url: string | null
                    updated_at: string
                }
                Insert: {
                    bio?: string | null
                    created_at?: string
                    cv_url?: string | null
                    embedding?: string | null
                    expertise?: string[] | null
                    id: string
                    is_active?: boolean | null
                    photo_url?: string | null
                    updated_at?: string
                }
                Update: {
                    bio?: string | null
                    created_at?: string
                    cv_url?: string | null
                    embedding?: string | null
                    expertise?: string[] | null
                    id?: string
                    is_active?: boolean | null
                    photo_url?: string | null
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "mentors_id_fkey"
                        columns: ["id"]
                        isOneToOne: true
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            mentorship_requests: {
                Row: {
                    created_at: string
                    id: string
                    mentor_id: string
                    responses: Json
                    status: string
                    student_id: string
                    updated_at: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    mentor_id: string
                    responses: Json
                    status?: string
                    student_id: string
                    updated_at?: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    mentor_id?: string
                    responses?: Json
                    status?: string
                    student_id?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "mentorship_requests_mentor_id_fkey"
                        columns: ["mentor_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "mentorship_requests_student_id_fkey"
                        columns: ["student_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            notifications: {
                Row: {
                    created_at: string
                    data: Json | null
                    id: string
                    message: string
                    recipient_email: string
                    recipient_id: string
                    title: string
                    type: Database["public"]["Enums"]["notification_type"]
                    viewed: boolean
                }
                Insert: {
                    created_at?: string
                    data?: Json | null
                    id?: string
                    message: string
                    recipient_email: string
                    recipient_id: string
                    title: string
                    type: Database["public"]["Enums"]["notification_type"]
                    viewed?: boolean
                }
                Update: {
                    created_at?: string
                    data?: Json | null
                    id?: string
                    message?: string
                    recipient_email?: string
                    recipient_id?: string
                    title?: string
                    type?: Database["public"]["Enums"]["notification_type"]
                    viewed?: boolean
                }
                Relationships: [
                    {
                        foreignKeyName: "notifications_recipient_id_fkey"
                        columns: ["recipient_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    email: string | null
                    full_name: string | null
                    id: string
                    role: Database["public"]["Enums"]["user_role"] | null
                    updated_at: string | null
                }
                Insert: {
                    email?: string | null
                    full_name?: string | null
                    id: string
                    role?: Database["public"]["Enums"]["user_role"] | null
                    updated_at?: string | null
                }
                Update: {
                    email?: string | null
                    full_name?: string | null
                    id?: string
                    role?: Database["public"]["Enums"]["user_role"] | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            sessions: {
                Row: {
                    created_at: string
                    id: string
                    mentor_id: string
                    request_id: string | null
                    status: string
                    student_id: string
                    updated_at: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    mentor_id: string
                    request_id?: string | null
                    status?: string
                    student_id: string
                    updated_at?: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    mentor_id?: string
                    request_id?: string | null
                    status?: string
                    student_id?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "sessions_mentor_id_fkey"
                        columns: ["mentor_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sessions_request_id_fkey"
                        columns: ["request_id"]
                        isOneToOne: false
                        referencedRelation: "mentorship_requests"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sessions_student_id_fkey"
                        columns: ["student_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            match_mentors: {
                Args: {
                    query_embedding: string
                    match_threshold: number
                    match_count: number
                }
                Returns: {
                    id: string
                    bio: string
                    expertise: string[]
                    photo_url: string
                    full_name: string
                    similarity: number
                }[]
            }
        }
        Enums: {
            notification_type:
            | "mentorship_request"
            | "match_accepted"
            | "match_rejected"
            | "session_started"
            | "mentor_application_review_request"
            | "mentor_application_approved"
            | "mentor_application_denied"
            | "system_alert"
            user_role: "student" | "mentor" | "admin" | "client" | "admin-dev"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
