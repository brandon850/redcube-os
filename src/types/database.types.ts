export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // ─── CORE CRM ────────────────────────────────────────────────────────────
      companies: {
        Row: {
          id: string
          name: string
          domain: string | null
          industry: string | null
          qbo_customer_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          domain?: string | null
          industry?: string | null
          qbo_customer_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          domain?: string | null
          industry?: string | null
          qbo_customer_id?: string | null
          created_at?: string
        }
        Relationships: []
      }

      contacts: {
        Row: {
          id: string
          company_id: string | null
          assigned_to: string | null
          first_name: string
          last_name: string
          email: string
          phone: string | null
          status: string | null
          source: string | null
          lead_score: number
          email_status: string
          custom_fields: Json | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          assigned_to?: string | null
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          status?: string | null
          source?: string | null
          lead_score?: number
          email_status?: string
          custom_fields?: Json | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          assigned_to?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          status?: string | null
          source?: string | null
          lead_score?: number
          email_status?: string
          custom_fields?: Json | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      activities: {
        Row: {
          id: string
          contact_id: string | null
          user_id: string | null
          type: string
          body: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          contact_id?: string | null
          user_id?: string | null
          type: string
          body?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string | null
          user_id?: string | null
          type?: string
          body?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }

      tags: {
        Row: {
          id: string
          name: string
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string | null
          created_at?: string
        }
        Relationships: []
      }

      contact_tags: {
        Row: {
          contact_id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          tag_id?: string
        }
        Relationships: []
      }

      // ─── PIPELINE ────────────────────────────────────────────────────────────
      pipeline_stages: {
        Row: {
          id: string
          name: string
          position: number
          color: string | null
          default_probability: number | null
          stale_after_days: number | null
          auto_trigger: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          position: number
          color?: string | null
          default_probability?: number | null
          stale_after_days?: number | null
          auto_trigger?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          color?: string | null
          default_probability?: number | null
          stale_after_days?: number | null
          auto_trigger?: string | null
          created_at?: string
        }
        Relationships: []
      }

      deals: {
        Row: {
          id: string
          contact_id: string | null
          company_id: string | null
          stage_id: string | null
          proposal_id: string | null
          title: string
          value: number | null
          probability: number | null
          status: string
          clickup_folder_id: string | null
          clickup_list_id: string | null
          stripe_customer_id: string | null
          qbo_customer_id: string | null
          last_activity_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contact_id?: string | null
          company_id?: string | null
          stage_id?: string | null
          proposal_id?: string | null
          title: string
          value?: number | null
          probability?: number | null
          status?: string
          clickup_folder_id?: string | null
          clickup_list_id?: string | null
          stripe_customer_id?: string | null
          qbo_customer_id?: string | null
          last_activity_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string | null
          company_id?: string | null
          stage_id?: string | null
          proposal_id?: string | null
          title?: string
          value?: number | null
          probability?: number | null
          status?: string
          clickup_folder_id?: string | null
          clickup_list_id?: string | null
          stripe_customer_id?: string | null
          qbo_customer_id?: string | null
          last_activity_at?: string | null
          created_at?: string
        }
        Relationships: []
      }

      // ─── USERS ───────────────────────────────────────────────────────────────
      users: {
        Row: {
          id: string
          full_name: string | null
          email: string
          role: string
          calendar_url: string | null
          notification_prefs: Json | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email: string
          role?: string
          calendar_url?: string | null
          notification_prefs?: Json | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string
          role?: string
          calendar_url?: string | null
          notification_prefs?: Json | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }

      // ─── FORMS ───────────────────────────────────────────────────────────────
      forms: {
        Row: {
          brand_id: string | null
          id: string
          name: string
          embed_token: string
          fields: Json | null
          settings: Json | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          brand_id?: string | null
          id?: string
          name: string
          embed_token: string
          fields?: Json | null
          settings?: Json | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          brand_id?: string | null
          id?: string
          name?: string
          embed_token?: string
          fields?: Json | null
          settings?: Json | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }

      form_submissions: {
        Row: {
          id: string
          form_id: string | null
          contact_id: string | null
          data: Json | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          page_url: string | null
          referrer: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          form_id?: string | null
          contact_id?: string | null
          data?: Json | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          page_url?: string | null
          referrer?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          form_id?: string | null
          contact_id?: string | null
          data?: Json | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          page_url?: string | null
          referrer?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }

      // ─── CATALOG: SERVICES, PACKAGES & PROPOSALS ─────────────────────────────
      services: {
        Row: {
          brand_id: string | null
          id: string
          name: string
          emoji: string | null
          icon_bg: string | null
          icon_color: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          brand_id?: string | null
          id?: string
          name: string
          emoji?: string | null
          icon_bg?: string | null
          icon_color?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          brand_id?: string | null
          id?: string
          name?: string
          emoji?: string | null
          icon_bg?: string | null
          icon_color?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }

      packages: {
        Row: {
          id: string
          service_id: string | null
          name: string
          tier: string | null
          description: string | null
          tagline: string | null
          type: string | null
          base_price: number | null
          price_type: string
          setup_fee: number | null
          billing_cadence: string | null
          video_url: string | null
          featured: boolean
          stripe_product_id: string | null
          is_active: boolean
          is_popular: boolean
          requires_approval: boolean
          is_hidden: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          service_id?: string | null
          name: string
          tier?: string | null
          description?: string | null
          tagline?: string | null
          type?: string | null
          base_price?: number | null
          price_type?: string
          setup_fee?: number | null
          billing_cadence?: string | null
          video_url?: string | null
          featured?: boolean
          stripe_product_id?: string | null
          is_active?: boolean
          is_popular?: boolean
          requires_approval?: boolean
          is_hidden?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string | null
          name?: string
          tier?: string | null
          description?: string | null
          tagline?: string | null
          type?: string | null
          base_price?: number | null
          price_type?: string
          setup_fee?: number | null
          billing_cadence?: string | null
          video_url?: string | null
          featured?: boolean
          stripe_product_id?: string | null
          is_active?: boolean
          is_popular?: boolean
          requires_approval?: boolean
          is_hidden?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }

      package_line_items: {
        Row: {
          id: string
          package_id: string | null
          description: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          package_id?: string | null
          description: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          package_id?: string | null
          description?: string
          sort_order?: number | null
        }
        Relationships: []
      }

      package_addons: {
        Row: {
          id: string
          package_id: string | null
          name: string
          description: string | null
          price: number
          price_type: string
          sort_order: number
        }
        Insert: {
          id?: string
          package_id?: string | null
          name: string
          description?: string | null
          price?: number
          price_type?: string
          sort_order?: number
        }
        Update: {
          id?: string
          package_id?: string | null
          name?: string
          description?: string | null
          price?: number
          price_type?: string
          sort_order?: number
        }
        Relationships: []
      }

      service_addons: {
        Row: {
          id: string
          service_id: string | null
          name: string
          description: string | null
          price: number
          price_type: string
          sort_order: number
        }
        Insert: {
          id?: string
          service_id?: string | null
          name: string
          description?: string | null
          price?: number
          price_type?: string
          sort_order?: number
        }
        Update: {
          id?: string
          service_id?: string | null
          name?: string
          description?: string | null
          price?: number
          price_type?: string
          sort_order?: number
        }
        Relationships: []
      }

      proposals: {
        Row: {
          brand_id: string | null
          id: string
          deal_id: string | null
          contact_id: string | null
          created_by: string | null
          status: string | null
          intro_text: string | null
          payment_terms: string | null
          discount_pct: number
          valid_until: string | null
          pdf_url: string | null
          sent_at: string | null
          viewed_at: string | null
          signed_at: string | null
          view_count: number
          signer_name: string | null
          signer_ip: string | null
          version_number: number
          view_token: string | null
        }
        Insert: {
          brand_id?: string | null
          id?: string
          deal_id?: string | null
          contact_id?: string | null
          created_by?: string | null
          status?: string | null
          intro_text?: string | null
          payment_terms?: string | null
          discount_pct?: number
          valid_until?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          signed_at?: string | null
          view_count?: number
          signer_name?: string | null
          signer_ip?: string | null
          version_number?: number
          view_token?: string | null
        }
        Update: {
          brand_id?: string | null
          id?: string
          deal_id?: string | null
          contact_id?: string | null
          created_by?: string | null
          status?: string | null
          intro_text?: string | null
          payment_terms?: string | null
          discount_pct?: number
          valid_until?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          signed_at?: string | null
          view_count?: number
          signer_name?: string | null
          signer_ip?: string | null
          version_number?: number
          view_token?: string | null
        }
        Relationships: []
      }

      proposal_packages: {
        Row: {
          id: string
          proposal_id: string | null
          package_id: string | null
          name_snapshot: string | null
          description_snapshot: string | null
          price_type_snapshot: string | null
          price_override: number | null
          addons_snapshot: Json | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          proposal_id?: string | null
          package_id?: string | null
          name_snapshot?: string | null
          description_snapshot?: string | null
          price_type_snapshot?: string | null
          price_override?: number | null
          addons_snapshot?: Json | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          proposal_id?: string | null
          package_id?: string | null
          name_snapshot?: string | null
          description_snapshot?: string | null
          price_type_snapshot?: string | null
          price_override?: number | null
          addons_snapshot?: Json | null
          sort_order?: number | null
        }
        Relationships: []
      }

      // ─── CONTRACTS ───────────────────────────────────────────────────────────
      contracts: {
        Row: {
          id: string
          proposal_id: string | null
          deal_id: string | null
          docusign_envelope_id: string | null
          status: string | null
          completed_at: string | null
          signed_pdf_url: string | null
          declined_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          proposal_id?: string | null
          deal_id?: string | null
          docusign_envelope_id?: string | null
          status?: string | null
          completed_at?: string | null
          signed_pdf_url?: string | null
          declined_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string | null
          deal_id?: string | null
          docusign_envelope_id?: string | null
          status?: string | null
          completed_at?: string | null
          signed_pdf_url?: string | null
          declined_reason?: string | null
          created_at?: string
        }
        Relationships: []
      }

      contract_signers: {
        Row: {
          id: string
          contract_id: string | null
          name: string
          email: string
          routing_order: number | null
          status: string | null
          signed_at: string | null
        }
        Insert: {
          id?: string
          contract_id?: string | null
          name: string
          email: string
          routing_order?: number | null
          status?: string | null
          signed_at?: string | null
        }
        Update: {
          id?: string
          contract_id?: string | null
          name?: string
          email?: string
          routing_order?: number | null
          status?: string | null
          signed_at?: string | null
        }
        Relationships: []
      }

      // ─── BILLING ─────────────────────────────────────────────────────────────
      invoices: {
        Row: {
          brand_id: string | null
          id: string
          deal_id: string | null
          contact_id: string | null
          stripe_invoice_id: string
          qbo_invoice_id: string | null
          status: string | null
          amount_due: number | null
          amount_paid: number | null
          paid_at: string | null
          qbo_sync_status: string
          created_at: string
        }
        Insert: {
          brand_id?: string | null
          id?: string
          deal_id?: string | null
          contact_id?: string | null
          stripe_invoice_id: string
          qbo_invoice_id?: string | null
          status?: string | null
          amount_due?: number | null
          amount_paid?: number | null
          paid_at?: string | null
          qbo_sync_status?: string
          created_at?: string
        }
        Update: {
          brand_id?: string | null
          id?: string
          deal_id?: string | null
          contact_id?: string | null
          stripe_invoice_id?: string
          qbo_invoice_id?: string | null
          status?: string | null
          amount_due?: number | null
          amount_paid?: number | null
          paid_at?: string | null
          qbo_sync_status?: string
          created_at?: string
        }
        Relationships: []
      }

      // ─── AUTOMATION ──────────────────────────────────────────────────────────
      sequences: {
        Row: {
          id: string
          name: string
          trigger_type: string | null
          trigger_config: Json | null
          exit_conditions: Json | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          trigger_type?: string | null
          trigger_config?: Json | null
          exit_conditions?: Json | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          trigger_type?: string | null
          trigger_config?: Json | null
          exit_conditions?: Json | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }

      sequence_steps: {
        Row: {
          id: string
          sequence_id: string | null
          position: number
          type: string
          config: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          sequence_id?: string | null
          position: number
          type: string
          config?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          sequence_id?: string | null
          position?: number
          type?: string
          config?: Json | null
          created_at?: string
        }
        Relationships: []
      }

      contact_sequences: {
        Row: {
          id: string
          contact_id: string | null
          sequence_id: string | null
          status: string | null
          enrolled_at: string | null
          completed_at: string | null
          exit_reason: string | null
        }
        Insert: {
          id?: string
          contact_id?: string | null
          sequence_id?: string | null
          status?: string | null
          enrolled_at?: string | null
          completed_at?: string | null
          exit_reason?: string | null
        }
        Update: {
          id?: string
          contact_id?: string | null
          sequence_id?: string | null
          status?: string | null
          enrolled_at?: string | null
          completed_at?: string | null
          exit_reason?: string | null
        }
        Relationships: []
      }

      contact_sequence_steps: {
        Row: {
          id: string
          contact_sequence_id: string | null
          sequence_step_id: string | null
          status: string
          execute_at: string | null
          executed_at: string | null
          result: Json | null
        }
        Insert: {
          id?: string
          contact_sequence_id?: string | null
          sequence_step_id?: string | null
          status?: string
          execute_at?: string | null
          executed_at?: string | null
          result?: Json | null
        }
        Update: {
          id?: string
          contact_sequence_id?: string | null
          sequence_step_id?: string | null
          status?: string
          execute_at?: string | null
          executed_at?: string | null
          result?: Json | null
        }
        Relationships: []
      }

      // ─── EMAIL ───────────────────────────────────────────────────────────────
      email_logs: {
        Row: {
          id: string
          contact_id: string | null
          sequence_step_id: string | null
          message_id: string
          template_id: string | null
          subject: string | null
          to_email: string
          status: string | null
          sent_at: string | null
          opened_at: string | null
          clicked_at: string | null
          open_count: number
          click_count: number
        }
        Insert: {
          id?: string
          contact_id?: string | null
          sequence_step_id?: string | null
          message_id: string
          template_id?: string | null
          subject?: string | null
          to_email: string
          status?: string | null
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          open_count?: number
          click_count?: number
        }
        Update: {
          id?: string
          contact_id?: string | null
          sequence_step_id?: string | null
          message_id?: string
          template_id?: string | null
          subject?: string | null
          to_email?: string
          status?: string | null
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          open_count?: number
          click_count?: number
        }
        Relationships: []
      }

      // ─── CLICKUP ─────────────────────────────────────────────────────────────
      clickup_templates: {
        Row: {
          id: string
          name: string
          is_active: boolean
          version: number
          phases: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          version?: number
          phases?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          version?: number
          phases?: Json | null
          created_at?: string
        }
        Relationships: []
      }

      // ─── CASCADE LOG ─────────────────────────────────────────────────────────
      cascade_log: {
        Row: {
          id: string
          deal_id: string | null
          job_type: string | null
          status: string | null
          external_id: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          deal_id?: string | null
          job_type?: string | null
          status?: string | null
          external_id?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          deal_id?: string | null
          job_type?: string | null
          status?: string | null
          external_id?: string | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }

      // ─── ATTRACT: PUBLIC SEO AUDITS ──────────────────────────────────────────
      audits: {
        Row: {
          brand_id: string | null
          id: string
          contact_id: string | null
          deal_id: string | null
          email: string
          name: string | null
          url: string
          domain: string | null
          grade: string | null
          overall_score: number | null
          pages_scanned: number | null
          report_data: Json | null
          created_at: string
        }
        Insert: {
          brand_id?: string | null
          id?: string
          contact_id?: string | null
          deal_id?: string | null
          email: string
          name?: string | null
          url: string
          domain?: string | null
          grade?: string | null
          overall_score?: number | null
          pages_scanned?: number | null
          report_data?: Json | null
          created_at?: string
        }
        Update: {
          brand_id?: string | null
          id?: string
          contact_id?: string | null
          deal_id?: string | null
          email?: string
          name?: string | null
          url?: string
          domain?: string | null
          grade?: string | null
          overall_score?: number | null
          pages_scanned?: number | null
          report_data?: Json | null
          created_at?: string
        }
        Relationships: []
      }

      // ─── DELIVER: ONGOING SEO MANAGEMENT ─────────────────────────────────────
      managed_sites: {
        Row: {
          brand_id: string | null
          id: string
          company_id: string | null
          deal_id: string | null
          name: string
          url: string
          domain: string | null
          gsc_property: string | null
          settings: Json | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          brand_id?: string | null
          id?: string
          company_id?: string | null
          deal_id?: string | null
          name: string
          url: string
          domain?: string | null
          gsc_property?: string | null
          settings?: Json | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          brand_id?: string | null
          id?: string
          company_id?: string | null
          deal_id?: string | null
          name?: string
          url?: string
          domain?: string | null
          gsc_property?: string | null
          settings?: Json | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }

      site_pages: {
        Row: {
          id: string
          site_id: string | null
          url: string
          title: string | null
          metrics: Json | null
          last_audited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          site_id?: string | null
          url: string
          title?: string | null
          metrics?: Json | null
          last_audited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          site_id?: string | null
          url?: string
          title?: string | null
          metrics?: Json | null
          last_audited_at?: string | null
          created_at?: string
        }
        Relationships: []
      }

      site_audits: {
        Row: {
          id: string
          site_id: string | null
          overall_score: number | null
          grade: string | null
          report_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          site_id?: string | null
          overall_score?: number | null
          grade?: string | null
          report_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          site_id?: string | null
          overall_score?: number | null
          grade?: string | null
          report_data?: Json | null
          created_at?: string
        }
        Relationships: []
      }

      keyword_groups: {
        Row: {
          id: string
          site_id: string | null
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          site_id?: string | null
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          site_id?: string | null
          name?: string
          created_at?: string
        }
        Relationships: []
      }

      site_keywords: {
        Row: {
          id: string
          site_id: string | null
          group_id: string | null
          keyword: string
          position: number | null
          search_volume: number | null
          tracked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          site_id?: string | null
          group_id?: string | null
          keyword: string
          position?: number | null
          search_volume?: number | null
          tracked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          site_id?: string | null
          group_id?: string | null
          keyword?: string
          position?: number | null
          search_volume?: number | null
          tracked_at?: string | null
          created_at?: string
        }
        Relationships: []
      }

      content_drafts: {
        Row: {
          id: string
          site_id: string | null
          title: string
          body: string | null
          status: string
          target_keyword: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id?: string | null
          title: string
          body?: string | null
          status?: string
          target_keyword?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string | null
          title?: string
          body?: string | null
          status?: string
          target_keyword?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      checklist_items: {
        Row: {
          id: string
          site_id: string | null
          label: string
          category: string | null
          is_completed: boolean
          is_ignored: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          site_id?: string | null
          label: string
          category?: string | null
          is_completed?: boolean
          is_ignored?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          site_id?: string | null
          label?: string
          category?: string | null
          is_completed?: boolean
          is_ignored?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }

      client_reports: {
        Row: {
          brand_id: string | null
          id: string
          site_id: string | null
          title: string
          period_start: string | null
          period_end: string | null
          report_data: Json | null
          created_at: string
        }
        Insert: {
          brand_id?: string | null
          id?: string
          site_id?: string | null
          title: string
          period_start?: string | null
          period_end?: string | null
          report_data?: Json | null
          created_at?: string
        }
        Update: {
          brand_id?: string | null
          id?: string
          site_id?: string | null
          title?: string
          period_start?: string | null
          period_end?: string | null
          report_data?: Json | null
          created_at?: string
        }
        Relationships: []
      }

      gsc_connections: {
        Row: {
          id: string
          site_id: string | null
          property_url: string | null
          access_token: string | null
          refresh_token: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          site_id?: string | null
          property_url?: string | null
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          site_id?: string | null
          property_url?: string | null
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }

      // ─── SETTINGS ────────────────────────────────────────────────────────────
      company_settings: {
        Row: {
          id: number
          company_name: string | null
          website: string | null
          from_name: string | null
          from_email: string | null
          reply_to: string | null
          business_address: string | null
          default_proposal_validity_days: number | null
          default_payment_terms: string | null
          require_approval: boolean
          brand_color: string | null
          proposal_footer: string | null
          logo_url: string | null
          email_settings: Json | null
          updated_at: string
        }
        Insert: {
          id?: number
          company_name?: string | null
          website?: string | null
          from_name?: string | null
          from_email?: string | null
          reply_to?: string | null
          business_address?: string | null
          default_proposal_validity_days?: number | null
          default_payment_terms?: string | null
          require_approval?: boolean
          brand_color?: string | null
          proposal_footer?: string | null
          logo_url?: string | null
          email_settings?: Json | null
          updated_at?: string
        }
        Update: {
          id?: number
          company_name?: string | null
          website?: string | null
          from_name?: string | null
          from_email?: string | null
          reply_to?: string | null
          business_address?: string | null
          default_proposal_validity_days?: number | null
          default_payment_terms?: string | null
          require_approval?: boolean
          brand_color?: string | null
          proposal_footer?: string | null
          logo_url?: string | null
          email_settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }

      // ─── BRANDS (multi-brand) ────────────────────────────────────────────────
      brands: {
        Row: {
          id: string
          name: string
          slug: string
          brand_color: string | null
          logo_url: string | null
          from_name: string | null
          from_email: string | null
          reply_to: string | null
          website: string | null
          business_address: string | null
          default_proposal_validity_days: number | null
          default_payment_terms: string | null
          proposal_footer: string | null
          is_default: boolean
          seo_enabled: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          brand_color?: string | null
          logo_url?: string | null
          from_name?: string | null
          from_email?: string | null
          reply_to?: string | null
          website?: string | null
          business_address?: string | null
          default_proposal_validity_days?: number | null
          default_payment_terms?: string | null
          proposal_footer?: string | null
          is_default?: boolean
          seo_enabled?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          brand_color?: string | null
          logo_url?: string | null
          from_name?: string | null
          from_email?: string | null
          reply_to?: string | null
          website?: string | null
          business_address?: string | null
          default_proposal_validity_days?: number | null
          default_payment_terms?: string | null
          proposal_footer?: string | null
          is_default?: boolean
          seo_enabled?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      submit_form: {
        Args: {
          p_token: string
          p_data: Json
          p_utm?: Json
          p_page_url?: string | null
          p_referrer?: string | null
        }
        Returns: Json
      }
      ingest_audit: {
        Args: {
          p_email: string
          p_name: string | null
          p_url: string
          p_result: Json
        }
        Returns: Json
      }
      get_public_proposal: {
        Args: { p_token: string }
        Returns: Json
      }
      accept_proposal: {
        Args: { p_token: string; p_selections: Json; p_signer_name: string }
        Returns: Json
      }
      run_onboarding: {
        Args: { p_deal_id: string }
        Returns: Json
      }
    }

    Enums: {
      [_ in never]: never
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ─── Convenience re-exports ────────────────────────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// ─── Named row types ──────────────────────────────────────────────────────────
export type Company = Tables<'companies'>
export type Contact = Tables<'contacts'>
export type Activity = Tables<'activities'>
export type Tag = Tables<'tags'>
export type ContactTag = Tables<'contact_tags'>
export type PipelineStage = Tables<'pipeline_stages'>
export type Deal = Tables<'deals'>
export type User = Tables<'users'>
export type Form = Tables<'forms'>
export type FormSubmission = Tables<'form_submissions'>
export type Service = Tables<'services'>
export type Package = Tables<'packages'>
export type PackageLineItem = Tables<'package_line_items'>
export type PackageAddon = Tables<'package_addons'>
export type ServiceAddon = Tables<'service_addons'>
export type Proposal = Tables<'proposals'>
export type ProposalPackage = Tables<'proposal_packages'>
export type Contract = Tables<'contracts'>
export type ContractSigner = Tables<'contract_signers'>
export type Invoice = Tables<'invoices'>
export type Sequence = Tables<'sequences'>
export type SequenceStep = Tables<'sequence_steps'>
export type ContactSequence = Tables<'contact_sequences'>
export type ContactSequenceStep = Tables<'contact_sequence_steps'>
export type EmailLog = Tables<'email_logs'>
export type ClickupTemplate = Tables<'clickup_templates'>
export type CascadeLog = Tables<'cascade_log'>
// Attract
export type Audit = Tables<'audits'>
// Deliver
export type ManagedSite = Tables<'managed_sites'>
export type SitePage = Tables<'site_pages'>
export type SiteAudit = Tables<'site_audits'>
export type KeywordGroup = Tables<'keyword_groups'>
export type SiteKeyword = Tables<'site_keywords'>
export type ContentDraft = Tables<'content_drafts'>
export type ChecklistItem = Tables<'checklist_items'>
export type ClientReport = Tables<'client_reports'>
export type GscConnection = Tables<'gsc_connections'>
// Settings
export type CompanySettings = Tables<'company_settings'>
export type Brand = Tables<'brands'>
