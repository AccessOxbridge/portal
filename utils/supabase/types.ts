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
      articles: {
        Row: {
          author: string
          body: string
          categories: Database["public"]["Enums"]["blog_category"][]
          created_at: string | null
          description: string
          featured: boolean | null
          id: string
          image: string
          permalink: string | null
          published_at: string
          reading_time: number
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author: string
          body: string
          categories: Database["public"]["Enums"]["blog_category"][]
          created_at?: string | null
          description: string
          featured?: boolean | null
          id?: string
          image: string
          permalink?: string | null
          published_at?: string
          reading_time: number
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          body?: string
          categories?: Database["public"]["Enums"]["blog_category"][]
          created_at?: string | null
          description?: string
          featured?: boolean | null
          id?: string
          image?: string
          permalink?: string | null
          published_at?: string
          reading_time?: number
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          admin_id: string | null
          created_at: string | null
          id: string
          last_message_at: string | null
          mentor_id: string
          session_id: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          mentor_id: string
          session_id?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          mentor_id?: string
          session_id?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packages: {
        Row: {
          created_at: string | null
          credits: number
          currency: string
          description: string | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price_cents: number
          sort_order: number | null
          stripe_price_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits: number
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price_cents: number
          sort_order?: number | null
          stripe_price_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price_cents?: number
          sort_order?: number | null
          stripe_price_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          amount_paid_cents: number
          completed_at: string | null
          created_at: string | null
          credits_purchased: number
          currency: string
          id: string
          package_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid_cents: number
          completed_at?: string | null
          created_at?: string | null
          credits_purchased: number
          currency?: string
          id?: string
          package_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid_cents?: number
          completed_at?: string | null
          created_at?: string | null
          credits_purchased?: number
          currency?: string
          id?: string
          package_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "credit_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          event_id: string | null
          id: string
          registered_at: string | null
          user_id: string | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          registered_at?: string | null
          user_id?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          registered_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          created_at: string | null
          date: string
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          event_type: string
          host: string | null
          id: string
          is_active: boolean | null
          location: string | null
          meeting_url: string | null
          recording_url: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          date: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          event_type: string
          host?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          meeting_url?: string | null
          recording_url?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          date?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          event_type?: string
          host?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          meeting_url?: string | null
          recording_url?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      form_responses: {
        Row: {
          created_at: string | null
          form_type: string
          id: string
          rating: number | null
          respondent_id: string
          responses: Json
          session_id: string
        }
        Insert: {
          created_at?: string | null
          form_type: string
          id?: string
          rating?: number | null
          respondent_id: string
          responses?: Json
          session_id: string
        }
        Update: {
          created_at?: string | null
          form_type?: string
          id?: string
          rating?: number | null
          respondent_id?: string
          responses?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_payout_items: {
        Row: {
          amount_cents: number
          created_at: string | null
          duration_minutes: number
          hourly_rate_cents: number
          id: string
          payout_id: string
          session_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          duration_minutes: number
          hourly_rate_cents: number
          id?: string
          payout_id: string
          session_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          duration_minutes?: number
          hourly_rate_cents?: number
          id?: string
          payout_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "mentor_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_payout_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_payouts: {
        Row: {
          amount_cents: number
          created_at: string | null
          currency: string
          failure_message: string | null
          id: string
          mentor_id: string
          paid_at: string | null
          period_end: string
          period_start: string
          processed_at: string | null
          sessions_count: number
          status: string
          stripe_payout_id: string | null
          stripe_transfer_id: string | null
          total_minutes: number
          updated_at: string | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string | null
          currency?: string
          failure_message?: string | null
          id?: string
          mentor_id: string
          paid_at?: string | null
          period_end: string
          period_start: string
          processed_at?: string | null
          sessions_count?: number
          status?: string
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          total_minutes?: number
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          currency?: string
          failure_message?: string | null
          id?: string
          mentor_id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          processed_at?: string | null
          sessions_count?: number
          status?: string
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          total_minutes?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_payouts_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          background_check_confirmed_at: string | null
          bio: string | null
          contract_signature: string | null
          contract_signed_at: string | null
          created_at: string
          cv_url: string | null
          dbs_certificate_url: string | null
          embedding: string | null
          expertise: string[] | null
          hourly_rate_cents: number | null
          id: string
          is_active: boolean | null
          payouts_enabled: boolean | null
          phone: string | null
          photo_url: string | null
          profile_completed_at: string | null
          quiz_answers: Json | null
          quiz_completed_at: string | null
          responses: Json | null
          status: Database["public"]["Enums"]["mentor_status"] | null
          stripe_account_id: string | null
          training_completed_at: string | null
          university: string | null
          updated_at: string
        }
        Insert: {
          background_check_confirmed_at?: string | null
          bio?: string | null
          contract_signature?: string | null
          contract_signed_at?: string | null
          created_at?: string
          cv_url?: string | null
          dbs_certificate_url?: string | null
          embedding?: string | null
          expertise?: string[] | null
          hourly_rate_cents?: number | null
          id: string
          is_active?: boolean | null
          payouts_enabled?: boolean | null
          phone?: string | null
          photo_url?: string | null
          profile_completed_at?: string | null
          quiz_answers?: Json | null
          quiz_completed_at?: string | null
          responses?: Json | null
          status?: Database["public"]["Enums"]["mentor_status"] | null
          stripe_account_id?: string | null
          training_completed_at?: string | null
          university?: string | null
          updated_at?: string
        }
        Update: {
          background_check_confirmed_at?: string | null
          bio?: string | null
          contract_signature?: string | null
          contract_signed_at?: string | null
          created_at?: string
          cv_url?: string | null
          dbs_certificate_url?: string | null
          embedding?: string | null
          expertise?: string[] | null
          hourly_rate_cents?: number | null
          id?: string
          is_active?: boolean | null
          payouts_enabled?: boolean | null
          phone?: string | null
          photo_url?: string | null
          profile_completed_at?: string | null
          quiz_answers?: Json | null
          quiz_completed_at?: string | null
          responses?: Json | null
          status?: Database["public"]["Enums"]["mentor_status"] | null
          stripe_account_id?: string | null
          training_completed_at?: string | null
          university?: string | null
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
          created_at: string | null
          id: string
          mentor_id: string
          responses: Json
          status: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentor_id: string
          responses: Json
          status?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mentor_id?: string
          responses?: Json
          status?: string
          student_id?: string
          updated_at?: string | null
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
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
          credits: number | null
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          credits?: number | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          credits?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      session_reports: {
        Row: {
          action_items: Json | null
          created_at: string | null
          id: string
          key_points: Json | null
          personalized_report: string | null
          personalized_report_generated_at: string | null
          raw_transcript: string | null
          session_id: string
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          created_at?: string | null
          id?: string
          key_points?: Json | null
          personalized_report?: string | null
          personalized_report_generated_at?: string | null
          raw_transcript?: string | null
          session_id: string
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          created_at?: string | null
          id?: string
          key_points?: Json | null
          personalized_report?: string | null
          personalized_report_generated_at?: string | null
          raw_transcript?: string | null
          session_id?: string
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string
          mentor_id: string
          reminder_sent: boolean | null
          request_id: string | null
          scheduled_at: string | null
          selected_slot: Json | null
          status: string
          student_id: string
          transcript_url: string | null
          updated_at: string | null
          zoom_join_url: string | null
          zoom_meeting_id: string | null
          zoom_meeting_status: string | null
          zoom_start_url: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          mentor_id: string
          reminder_sent?: boolean | null
          request_id?: string | null
          scheduled_at?: string | null
          selected_slot?: Json | null
          status?: string
          student_id: string
          transcript_url?: string | null
          updated_at?: string | null
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_meeting_status?: string | null
          zoom_start_url?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          mentor_id?: string
          reminder_sent?: boolean | null
          request_id?: string | null
          scheduled_at?: string | null
          selected_slot?: Json | null
          status?: string
          student_id?: string
          transcript_url?: string | null
          updated_at?: string | null
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_meeting_status?: string | null
          zoom_start_url?: string | null
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
            foreignKeyName: "sessions_mentor_id_mentors_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
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
      student_profiles: {
        Row: {
          application_year: number | null
          created_at: string | null
          extracurriculars: string | null
          gcse_results: Json | null
          id: string
          interests: string | null
          is_complete: boolean | null
          school_name: string | null
          subjects: Json | null
          target_course: string | null
          target_university: string | null
          updated_at: string | null
          year_group: string | null
        }
        Insert: {
          application_year?: number | null
          created_at?: string | null
          extracurriculars?: string | null
          gcse_results?: Json | null
          id: string
          interests?: string | null
          is_complete?: boolean | null
          school_name?: string | null
          subjects?: Json | null
          target_course?: string | null
          target_university?: string | null
          updated_at?: string | null
          year_group?: string | null
        }
        Update: {
          application_year?: number | null
          created_at?: string | null
          extracurriculars?: string | null
          gcse_results?: Json | null
          id?: string
          interests?: string | null
          is_complete?: boolean | null
          school_name?: string | null
          subjects?: Json | null
          target_course?: string | null
          target_university?: string | null
          updated_at?: string | null
          year_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_issues: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          description: string
          id: string
          issue_type: string
          payout_id: string | null
          priority: string
          reporter_id: string
          reporter_type: string
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description: string
          id?: string
          issue_type: string
          payout_id?: string | null
          priority?: string
          reporter_id: string
          reporter_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string
          id?: string
          issue_type?: string
          payout_id?: string | null
          priority?: string
          reporter_id?: string
          reporter_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_issues_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "mentor_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_issues_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_issues_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_issues_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
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
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          bio: string
          expertise: string[]
          full_name: string
          id: string
          photo_url: string
          similarity: number
        }[]
      }
    }
    Enums: {
      blog_category:
      | "Oxbridge Admissions"
      | "Interview Tips"
      | "Personal Statement"
      | "UK Universities"
      | "Student Stories"
      | "Admissions Guide"
      | "International Students"
      mentor_status: "active" | "pending_approval" | "details_required"
      notification_type:
      | "mentorship_request"
      | "match_accepted"
      | "match_rejected"
      | "session_started"
      | "mentor_application_review_request"
      | "mentor_application_approved"
      | "mentor_application_denied"
      | "system_alert"
      | "session_confirmed"
      | "session_reminder"
      user_role: "student" | "mentor" | "admin" | "client" | "admin-dev"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      blog_category: [
        "Oxbridge Admissions",
        "Interview Tips",
        "Personal Statement",
        "UK Universities",
        "Student Stories",
        "Admissions Guide",
        "International Students",
      ],
      mentor_status: ["active", "pending_approval", "details_required"],
      notification_type: [
        "mentorship_request",
        "match_accepted",
        "match_rejected",
        "session_started",
        "mentor_application_review_request",
        "mentor_application_approved",
        "mentor_application_denied",
        "system_alert",
        "session_confirmed",
        "session_reminder",
      ],
      user_role: ["student", "mentor", "admin", "client", "admin-dev"],
    },
  },
} as const
