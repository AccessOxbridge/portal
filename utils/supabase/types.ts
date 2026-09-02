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
          categories?: Database["public"]["Enums"]["blog_category"][]
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
          mentor_id: string | null
          mentor_notified_at: string | null
          session_id: string | null
          student_id: string | null
          student_notified_at: string | null
          type: string
          updated_at: string | null
          participant_set_key: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          mentor_id?: string | null
          mentor_notified_at?: string | null
          session_id?: string | null
          student_id?: string | null
          student_notified_at?: string | null
          type?: string
          updated_at?: string | null
          participant_set_key?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          mentor_id?: string | null
          mentor_notified_at?: string | null
          session_id?: string | null
          student_id?: string | null
          student_notified_at?: string | null
          type?: string
          updated_at?: string | null
          participant_set_key?: string | null
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
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          last_notified_at: string | null
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          last_notified_at?: string | null
          last_read_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          last_notified_at?: string | null
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          bio: string | null
          created_at: string
          email: string
          id: string
          name: string
          referrals_count: number | null
          tracking_code: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          referrals_count?: number | null
          tracking_code: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          referrals_count?: number | null
          tracking_code?: string
        }
        Relationships: []
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
      login_events: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          status: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mentor_invoice_documents: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          kind: string
          pdf_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          kind: string
          pdf_path: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          kind?: string
          pdf_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_invoice_documents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "mentor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_invoice_items: {
        Row: {
          amount_cents: number
          description: string
          duration_minutes: number
          hourly_rate_cents: number
          id: string
          invoice_id: string
          session_date: string | null
          session_id: string | null
          student_name: string | null
        }
        Insert: {
          amount_cents: number
          description?: string
          duration_minutes: number
          hourly_rate_cents: number
          id?: string
          invoice_id: string
          session_date?: string | null
          session_id?: string | null
          student_name?: string | null
        }
        Update: {
          amount_cents?: number
          description?: string
          duration_minutes?: number
          hourly_rate_cents?: number
          id?: string
          invoice_id?: string
          session_date?: string | null
          session_id?: string | null
          student_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "mentor_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_invoice_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_invoices: {
        Row: {
          created_at: string
          currency: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_reference: string | null
          is_self_billed: boolean
          mentor_id: string
          paid_at: string | null
          payout_id: string | null
          period_end: string | null
          period_start: string | null
          status: string
          submitted_at: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
          vat_cents: number
          voided_at: string | null
          withholding_cents: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_reference?: string | null
          is_self_billed?: boolean
          mentor_id: string
          paid_at?: string | null
          payout_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          submitted_at?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          vat_cents?: number
          voided_at?: string | null
          withholding_cents?: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_reference?: string | null
          is_self_billed?: boolean
          mentor_id?: string
          paid_at?: string | null
          payout_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          submitted_at?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          vat_cents?: number
          voided_at?: string | null
          withholding_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "mentor_invoices_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_invoices_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "mentor_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_session_checkins: {
        Row: {
          created_at: string
          dismissed: boolean
          homework_given: boolean | null
          mentor_id: string
          next_session_booked: boolean | null
          session_id: string
        }
        Insert: {
          created_at?: string
          dismissed?: boolean
          homework_given?: boolean | null
          mentor_id: string
          next_session_booked?: boolean | null
          session_id: string
        }
        Update: {
          created_at?: string
          dismissed?: boolean
          homework_given?: boolean | null
          mentor_id?: string
          next_session_booked?: boolean | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_session_checkins_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_session_checkins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
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
          invoice_id: string | null
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
          invoice_id?: string | null
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
          invoice_id?: string | null
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
            foreignKeyName: "mentor_payouts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "mentor_invoices"
            referencedColumns: ["id"]
          },
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
          q_alevels: string | null
          q_approach: string | null
          q_oxbridge_college: string | null
          q_specialisation: string | null
          questionnaire_completed_at: string | null
          quiz_answers: Json | null
          quiz_completed_at: string | null
          responses: Json | null
          status: Database["public"]["Enums"]["mentor_status"] | null
          stripe_account_id: string | null
          timezone: string | null
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
          q_alevels?: string | null
          q_approach?: string | null
          q_oxbridge_college?: string | null
          q_specialisation?: string | null
          questionnaire_completed_at?: string | null
          quiz_answers?: Json | null
          quiz_completed_at?: string | null
          responses?: Json | null
          status?: Database["public"]["Enums"]["mentor_status"] | null
          stripe_account_id?: string | null
          timezone?: string | null
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
          q_alevels?: string | null
          q_approach?: string | null
          q_oxbridge_college?: string | null
          q_specialisation?: string | null
          questionnaire_completed_at?: string | null
          quiz_answers?: Json | null
          quiz_completed_at?: string | null
          responses?: Json | null
          status?: Database["public"]["Enums"]["mentor_status"] | null
          stripe_account_id?: string | null
          timezone?: string | null
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
          initiated_by: string
          mentor_id: string
          reschedule_of_session_id: string | null
          responses: Json
          status: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          initiated_by?: string
          mentor_id: string
          reschedule_of_session_id?: string | null
          responses: Json
          status?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          initiated_by?: string
          mentor_id?: string
          reschedule_of_session_id?: string | null
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
            foreignKeyName: "mentorship_requests_reschedule_of_session_id_fkey"
            columns: ["reschedule_of_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
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
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          attachments?: Json | null
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
          member_code: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          credits?: number | null
          email?: string | null
          full_name?: string | null
          id: string
          member_code?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          credits?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          member_code?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      session_feedback_prompts: {
        Row: {
          dismissed_at: string
          session_id: string
          student_id: string
        }
        Insert: {
          dismissed_at?: string
          session_id: string
          student_id: string
        }
        Update: {
          dismissed_at?: string
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_prompts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_feedback_prompts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_satisfaction_surveys: {
        Row: {
          comment: string | null
          mentoring_rating: number
          portal_rating: number
          progress_rating: number
          session_count: number
          sessions_completed: number | null
          student_id: string
          submitted_at: string
        }
        Insert: {
          comment?: string | null
          mentoring_rating: number
          portal_rating: number
          progress_rating: number
          session_count: number
          sessions_completed?: number | null
          student_id: string
          submitted_at?: string
        }
        Update: {
          comment?: string | null
          mentoring_rating?: number
          portal_rating?: number
          progress_rating?: number
          session_count?: number
          sessions_completed?: number | null
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_satisfaction_surveys_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_session_milestones: {
        Row: {
          acknowledged_at: string
          milestone: number
          sessions_completed: number | null
          student_id: string
        }
        Insert: {
          acknowledged_at?: string
          milestone: number
          sessions_completed?: number | null
          student_id: string
        }
        Update: {
          acknowledged_at?: string
          milestone?: number
          sessions_completed?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_session_milestones_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          first_session_followup_sent: boolean | null
          id: string
          invoice_id: string | null
          mentor_id: string
          payout_amount_cents: number | null
          recording_available: boolean
          recording_download_token: string | null
          recording_download_url: string | null
          recording_play_url: string | null
          reminder_sent: boolean | null
          request_id: string | null
          scheduled_at: string | null
          selected_slot: Json | null
          short_reminder_sent: boolean | null
          status: string
          student_id: string
          transcript_download_token: string | null
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
          first_session_followup_sent?: boolean | null
          id?: string
          invoice_id?: string | null
          mentor_id: string
          payout_amount_cents?: number | null
          recording_available?: boolean
          recording_download_token?: string | null
          recording_download_url?: string | null
          recording_play_url?: string | null
          reminder_sent?: boolean | null
          request_id?: string | null
          scheduled_at?: string | null
          selected_slot?: Json | null
          short_reminder_sent?: boolean | null
          status?: string
          student_id: string
          transcript_download_token?: string | null
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
          first_session_followup_sent?: boolean | null
          id?: string
          invoice_id?: string | null
          mentor_id?: string
          payout_amount_cents?: number | null
          recording_available?: boolean
          recording_download_token?: string | null
          recording_download_url?: string | null
          recording_play_url?: string | null
          reminder_sent?: boolean | null
          request_id?: string | null
          scheduled_at?: string | null
          selected_slot?: Json | null
          short_reminder_sent?: boolean | null
          status?: string
          student_id?: string
          transcript_download_token?: string | null
          transcript_url?: string | null
          updated_at?: string | null
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_meeting_status?: string | null
          zoom_start_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "mentor_invoices"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "sessions_mentor_id_mentors_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors_directory"
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
      student_mentor_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          ended_at: string | null
          id: string
          is_current: boolean
          last_inactivity_nudge_at: string | null
          mentor_id: string
          student_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          is_current?: boolean
          last_inactivity_nudge_at?: string | null
          mentor_id: string
          student_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          is_current?: boolean
          last_inactivity_nudge_at?: string | null
          mentor_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_mentor_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_mentor_assignments_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_mentor_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          additional_notes: string | null
          application_year: number | null
          created_at: string | null
          curriculum: string | null
          curriculum_other: string | null
          extracurriculars: string | null
          gcse_results: Json | null
          id: string
          interests: string | null
          is_complete: boolean | null
          parent_email: string | null
          school_country: string | null
          school_name: string | null
          subjects: Json | null
          target_course: string | null
          target_university: string | null
          timezone: string | null
          updated_at: string | null
          year_group: string | null
        }
        Insert: {
          additional_notes?: string | null
          application_year?: number | null
          created_at?: string | null
          curriculum?: string | null
          curriculum_other?: string | null
          extracurriculars?: string | null
          gcse_results?: Json | null
          id: string
          interests?: string | null
          is_complete?: boolean | null
          parent_email?: string | null
          school_country?: string | null
          school_name?: string | null
          subjects?: Json | null
          target_course?: string | null
          target_university?: string | null
          timezone?: string | null
          updated_at?: string | null
          year_group?: string | null
        }
        Update: {
          additional_notes?: string | null
          application_year?: number | null
          created_at?: string | null
          curriculum?: string | null
          curriculum_other?: string | null
          extracurriculars?: string | null
          gcse_results?: Json | null
          id?: string
          interests?: string | null
          is_complete?: boolean | null
          parent_email?: string | null
          school_country?: string | null
          school_name?: string | null
          subjects?: Json | null
          target_course?: string | null
          target_university?: string | null
          timezone?: string | null
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
      mentors_directory: {
        Row: {
          active: boolean | null
          bio: string | null
          college: string | null
          degree_subject: string | null
          id: string | null
          name: string | null
          oxbridge_institution: string | null
          specialisms: string[] | null
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
    }
    Functions: {
      can_access_conversation_folder: {
        Args: { object_name: string }
        Returns: boolean
      }
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
      next_mentor_invoice_number: { Args: never; Returns: string }
      prune_login_events: { Args: never; Returns: undefined }
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
        | "mentor_session_request"
        | "session_reschedule_request"
        | "session_reschedule_accepted"
        | "session_reschedule_declined"
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
        "mentor_session_request",
        "session_reschedule_request",
        "session_reschedule_accepted",
        "session_reschedule_declined",
      ],
      user_role: ["student", "mentor", "admin", "client", "admin-dev"],
    },
  },
} as const
