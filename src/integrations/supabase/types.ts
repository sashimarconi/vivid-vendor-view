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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_cep: string | null
          customer_city: string | null
          customer_complement: string | null
          customer_document: string | null
          customer_email: string | null
          customer_name: string | null
          customer_neighborhood: string | null
          customer_number: string | null
          customer_phone: string | null
          customer_state: string | null
          id: string
          product_id: string | null
          product_variant: string | null
          session_id: string | null
          total: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_cep?: string | null
          customer_city?: string | null
          customer_complement?: string | null
          customer_document?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_neighborhood?: string | null
          customer_number?: string | null
          customer_phone?: string | null
          customer_state?: string | null
          id?: string
          product_id?: string | null
          product_variant?: string | null
          session_id?: string | null
          total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_cep?: string | null
          customer_city?: string | null
          customer_complement?: string | null
          customer_document?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_neighborhood?: string | null
          customer_number?: string | null
          customer_phone?: string | null
          customer_state?: string | null
          id?: string
          product_id?: string | null
          product_variant?: string | null
          session_id?: string | null
          total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      checkout_builder_config: {
        Row: {
          config: Json
          created_at: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      checkout_settings: {
        Row: {
          checkout_button_text: string
          checkout_header_text: string
          checkout_security_text: string
          created_at: string
          id: string
          pix_expiration_minutes: number
          pix_instruction_text: string
          pix_payment_title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          checkout_button_text?: string
          checkout_header_text?: string
          checkout_security_text?: string
          created_at?: string
          id?: string
          pix_expiration_minutes?: number
          pix_instruction_text?: string
          pix_payment_title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          checkout_button_text?: string
          checkout_header_text?: string
          checkout_security_text?: string
          created_at?: string
          id?: string
          pix_expiration_minutes?: number
          pix_instruction_text?: string
          pix_payment_title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      custom_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          updated_at: string
          user_id: string
          verification_token: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          updated_at?: string
          user_id: string
          verification_token?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          updated_at?: string
          user_id?: string
          verification_token?: string
          verified?: boolean
        }
        Relationships: []
      }
      gateway_settings: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          display_name: string | null
          gateway_name: string
          id: string
          logo_url: string | null
          public_key: string | null
          secret_key: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          gateway_name?: string
          id?: string
          logo_url?: string | null
          public_key?: string | null
          secret_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          gateway_name?: string
          id?: string
          logo_url?: string | null
          public_key?: string | null
          secret_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          desktop_enabled: boolean
          desktop_notify_paid: boolean
          desktop_notify_pending: boolean
          desktop_paid_body: string
          desktop_paid_duration_ms: number
          desktop_paid_icon_url: string | null
          desktop_paid_image_url: string | null
          desktop_paid_sound: string
          desktop_paid_sound_url: string | null
          desktop_paid_title: string
          desktop_pending_body: string
          desktop_pending_duration_ms: number
          desktop_pending_icon_url: string | null
          desktop_pending_image_url: string | null
          desktop_pending_sound: string
          desktop_pending_sound_url: string | null
          desktop_pending_title: string
          id: string
          mobile_enabled: boolean
          mobile_paid_body: string
          mobile_paid_icon_url: string | null
          mobile_paid_image_url: string | null
          mobile_paid_title: string
          mobile_pending_body: string
          mobile_pending_icon_url: string | null
          mobile_pending_image_url: string | null
          mobile_pending_title: string
          notify_paid: boolean
          notify_pending: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          desktop_enabled?: boolean
          desktop_notify_paid?: boolean
          desktop_notify_pending?: boolean
          desktop_paid_body?: string
          desktop_paid_duration_ms?: number
          desktop_paid_icon_url?: string | null
          desktop_paid_image_url?: string | null
          desktop_paid_sound?: string
          desktop_paid_sound_url?: string | null
          desktop_paid_title?: string
          desktop_pending_body?: string
          desktop_pending_duration_ms?: number
          desktop_pending_icon_url?: string | null
          desktop_pending_image_url?: string | null
          desktop_pending_sound?: string
          desktop_pending_sound_url?: string | null
          desktop_pending_title?: string
          id?: string
          mobile_enabled?: boolean
          mobile_paid_body?: string
          mobile_paid_icon_url?: string | null
          mobile_paid_image_url?: string | null
          mobile_paid_title?: string
          mobile_pending_body?: string
          mobile_pending_icon_url?: string | null
          mobile_pending_image_url?: string | null
          mobile_pending_title?: string
          notify_paid?: boolean
          notify_pending?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          desktop_enabled?: boolean
          desktop_notify_paid?: boolean
          desktop_notify_pending?: boolean
          desktop_paid_body?: string
          desktop_paid_duration_ms?: number
          desktop_paid_icon_url?: string | null
          desktop_paid_image_url?: string | null
          desktop_paid_sound?: string
          desktop_paid_sound_url?: string | null
          desktop_paid_title?: string
          desktop_pending_body?: string
          desktop_pending_duration_ms?: number
          desktop_pending_icon_url?: string | null
          desktop_pending_image_url?: string | null
          desktop_pending_sound?: string
          desktop_pending_sound_url?: string | null
          desktop_pending_title?: string
          id?: string
          mobile_enabled?: boolean
          mobile_paid_body?: string
          mobile_paid_icon_url?: string | null
          mobile_paid_image_url?: string | null
          mobile_paid_title?: string
          mobile_pending_body?: string
          mobile_pending_icon_url?: string | null
          mobile_pending_image_url?: string | null
          mobile_pending_title?: string
          notify_paid?: boolean
          notify_pending?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_bump_products: {
        Row: {
          created_at: string
          id: string
          order_bump_id: string
          product_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_bump_id: string
          product_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_bump_id?: string
          product_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_bump_products_order_bump_id_fkey"
            columns: ["order_bump_id"]
            isOneToOne: false
            referencedRelation: "order_bumps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bump_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_bumps: {
        Row: {
          active: boolean | null
          apply_to_all: boolean
          auto_add: boolean
          bump_type: string
          created_at: string
          id: string
          image_url: string | null
          mandatory: boolean
          max_cart_value: number
          max_quantity: number
          min_cart_value: number
          original_price: number | null
          position: number
          price: number
          product_id: string | null
          sort_order: number | null
          title: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          apply_to_all?: boolean
          auto_add?: boolean
          bump_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          mandatory?: boolean
          max_cart_value?: number
          max_quantity?: number
          min_cart_value?: number
          original_price?: number | null
          position?: number
          price?: number
          product_id?: string | null
          sort_order?: number | null
          title: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          apply_to_all?: boolean
          auto_add?: boolean
          bump_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          mandatory?: boolean
          max_cart_value?: number
          max_quantity?: number
          min_cart_value?: number
          original_price?: number | null
          position?: number
          price?: number
          product_id?: string | null
          sort_order?: number | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_bumps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bumps_total: number | null
          created_at: string
          customer_address: string | null
          customer_cep: string | null
          customer_city: string | null
          customer_complement: string | null
          customer_document: string
          customer_email: string
          customer_ip: string | null
          customer_name: string
          customer_neighborhood: string | null
          customer_number: string | null
          customer_phone: string
          customer_state: string | null
          customer_user_agent: string | null
          id: string
          paid_at: string | null
          payment_method: string
          payment_status: string
          pix_copied: boolean | null
          pix_copy_paste: string | null
          pix_expires_at: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          product_id: string | null
          product_variant: string | null
          quantity: number
          selected_bumps: Json | null
          shipping_cost: number | null
          shipping_option_id: string | null
          subtotal: number
          total: number
          transaction_id: string | null
          updated_at: string
          user_id: string | null
          utm_params: Json | null
        }
        Insert: {
          bumps_total?: number | null
          created_at?: string
          customer_address?: string | null
          customer_cep?: string | null
          customer_city?: string | null
          customer_complement?: string | null
          customer_document: string
          customer_email: string
          customer_ip?: string | null
          customer_name: string
          customer_neighborhood?: string | null
          customer_number?: string | null
          customer_phone: string
          customer_state?: string | null
          customer_user_agent?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string
          payment_status?: string
          pix_copied?: boolean | null
          pix_copy_paste?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          product_id?: string | null
          product_variant?: string | null
          quantity?: number
          selected_bumps?: Json | null
          shipping_cost?: number | null
          shipping_option_id?: string | null
          subtotal: number
          total: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
          utm_params?: Json | null
        }
        Update: {
          bumps_total?: number | null
          created_at?: string
          customer_address?: string | null
          customer_cep?: string | null
          customer_city?: string | null
          customer_complement?: string | null
          customer_document?: string
          customer_email?: string
          customer_ip?: string | null
          customer_name?: string
          customer_neighborhood?: string | null
          customer_number?: string | null
          customer_phone?: string
          customer_state?: string | null
          customer_user_agent?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string
          payment_status?: string
          pix_copied?: boolean | null
          pix_copy_paste?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          product_id?: string | null
          product_variant?: string | null
          quantity?: number
          selected_bumps?: Json | null
          shipping_cost?: number | null
          shipping_option_id?: string | null
          subtotal?: number
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
          utm_params?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_option_id_fkey"
            columns: ["shipping_option_id"]
            isOneToOne: false
            referencedRelation: "shipping_options"
            referencedColumns: ["id"]
          },
        ]
      }
      page_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          page_url: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number | null
          url: string
          user_id: string | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number | null
          url: string
          user_id?: string | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_page_builder_config: {
        Row: {
          config: Json
          created_at: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          product_id: string
          sort_order: number | null
          thumbnail_url: string | null
          user_id: string | null
          variant_group_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          product_id: string
          sort_order?: number | null
          thumbnail_url?: string | null
          user_id?: string | null
          variant_group_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          sort_order?: number | null
          thumbnail_url?: string | null
          user_id?: string | null
          variant_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_variant_group_id_fkey"
            columns: ["variant_group_id"]
            isOneToOne: false
            referencedRelation: "variant_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          checkout_type: string
          created_at: string
          description: string | null
          discount_percent: number
          estimated_delivery: string | null
          external_checkout_url: string | null
          flash_sale: boolean | null
          flash_sale_ends_in: string | null
          free_shipping: boolean | null
          id: string
          original_price: number
          promo_tag: string | null
          rating: number | null
          review_count: number | null
          sale_price: number
          shipping_cost: number | null
          slug: string
          sold_count: number | null
          sort_order: number | null
          thank_you_url: string | null
          title: string
          updated_at: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          active?: boolean | null
          checkout_type?: string
          created_at?: string
          description?: string | null
          discount_percent?: number
          estimated_delivery?: string | null
          external_checkout_url?: string | null
          flash_sale?: boolean | null
          flash_sale_ends_in?: string | null
          free_shipping?: boolean | null
          id?: string
          original_price: number
          promo_tag?: string | null
          rating?: number | null
          review_count?: number | null
          sale_price: number
          shipping_cost?: number | null
          slug: string
          sold_count?: number | null
          sort_order?: number | null
          thank_you_url?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          active?: boolean | null
          checkout_type?: string
          created_at?: string
          description?: string | null
          discount_percent?: number
          estimated_delivery?: string | null
          external_checkout_url?: string | null
          flash_sale?: boolean | null
          flash_sale_ends_in?: string | null
          free_shipping?: boolean | null
          id?: string
          original_price?: number
          promo_tag?: string | null
          rating?: number | null
          review_count?: number | null
          sale_price?: number
          shipping_cost?: number | null
          slug?: string
          sold_count?: number | null
          sort_order?: number | null
          thank_you_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked: boolean
          created_at: string
          full_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      review_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          review_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          review_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          review_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_products_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          active: boolean | null
          city: string | null
          comment: string | null
          created_at: string
          id: string
          photos: string[] | null
          product_id: string
          rating: number
          review_date: string | null
          updated_at: string
          user_avatar_url: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          active?: boolean | null
          city?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          photos?: string[] | null
          product_id: string
          rating?: number
          review_date?: string | null
          updated_at?: string
          user_avatar_url?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          active?: boolean | null
          city?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          photos?: string[] | null
          product_id?: string
          rating?: number
          review_date?: string | null
          updated_at?: string
          user_avatar_url?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_options: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          estimated_days: string | null
          free: boolean | null
          id: string
          logo_url: string | null
          name: string
          price: number
          sort_order: number | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          free?: boolean | null
          id?: string
          logo_url?: string | null
          name: string
          price?: number
          sort_order?: number | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          free?: boolean | null
          id?: string
          logo_url?: string | null
          name?: string
          price?: number
          sort_order?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      store_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          sort_order: number | null
          store_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number | null
          store_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number | null
          store_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          avatar_url: string | null
          checkout_logo_url: string | null
          created_at: string
          id: string
          name: string
          product_page_logo_url: string | null
          rating: number | null
          total_sales: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          checkout_logo_url?: string | null
          created_at?: string
          id?: string
          name?: string
          product_page_logo_url?: string | null
          rating?: number | null
          total_sales?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          checkout_logo_url?: string | null
          created_at?: string
          id?: string
          name?: string
          product_page_logo_url?: string | null
          rating?: number | null
          total_sales?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          rating: number | null
          slug: string
          sort_order: number | null
          total_sales: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          rating?: number | null
          slug: string
          sort_order?: number | null
          total_sales?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          rating?: number | null
          slug?: string
          sort_order?: number | null
          total_sales?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tracking_pixels: {
        Row: {
          access_token: string | null
          active: boolean | null
          created_at: string
          fire_on_paid_only: boolean
          id: string
          name: string | null
          pixel_id: string
          platform: string
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          active?: boolean | null
          created_at?: string
          fire_on_paid_only?: boolean
          id?: string
          name?: string | null
          pixel_id: string
          platform?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          active?: boolean | null
          created_at?: string
          fire_on_paid_only?: boolean
          id?: string
          name?: string | null
          pixel_id?: string
          platform?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trust_badges: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string
          description: string | null
          icon: string
          id: string
          sort_order: number | null
          title: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          sort_order?: number | null
          title: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          sort_order?: number | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          id: string
          monthly_price: number
          plan: Database["public"]["Enums"]["plan_type"]
          transaction_fee_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_price?: number
          plan?: Database["public"]["Enums"]["plan_type"]
          transaction_fee_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_price?: number
          plan?: Database["public"]["Enums"]["plan_type"]
          transaction_fee_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      utmify_settings: {
        Row: {
          active: boolean
          api_token: string
          created_at: string
          id: string
          platform_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          api_token: string
          created_at?: string
          id?: string
          platform_name?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          active?: boolean
          api_token?: string
          created_at?: string
          id?: string
          platform_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      variant_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string
          sort_order: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id: string
          sort_order?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          sort_order?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variant_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_sessions: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          last_seen_at: string
          latitude: number | null
          longitude: number | null
          page_url: string | null
          region: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string
          latitude?: number | null
          longitude?: number | null
          page_url?: string | null
          region?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string
          latitude?: number | null
          longitude?: number | null
          page_url?: string | null
          region?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          events: Json
          id: string
          name: string
          secret_key: string | null
          updated_at: string
          url: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          events?: Json
          id?: string
          name: string
          secret_key?: string | null
          updated_at?: string
          url: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          events?: Json
          id?: string
          name?: string
          secret_key?: string | null
          updated_at?: string
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      custom_domains_public: {
        Row: {
          created_at: string | null
          domain: string | null
          id: string | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      tracking_pixels_public: {
        Row: {
          active: boolean | null
          created_at: string | null
          fire_on_paid_only: boolean | null
          id: string | null
          pixel_id: string | null
          platform: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          fire_on_paid_only?: boolean | null
          id?: string | null
          pixel_id?: string | null
          platform?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          fire_on_paid_only?: boolean | null
          id?: string | null
          pixel_id?: string | null
          platform?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_analytics_summary: {
        Args: { days?: number }
        Returns: {
          conversion_rate: number
          total_abandoned_carts: number
          total_orders_period: number
          total_page_views: number
          total_revenue_period: number
          total_sessions: number
        }[]
      }
      admin_daily_orders: {
        Args: { days?: number }
        Returns: {
          day: string
          order_count: number
          paid_count: number
          revenue: number
        }[]
      }
      admin_daily_signups: {
        Args: { days?: number }
        Returns: {
          day: string
          signup_count: number
        }[]
      }
      admin_delete_user: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      admin_list_orders: {
        Args: { _limit?: number; _offset?: number; _status?: string }
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          order_id: string
          owner_email: string
          payment_method: string
          payment_status: string
          pix_copied: boolean
          product_title: string
          product_variant: string
          quantity: number
          total: number
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          avatar_url: string
          blocked: boolean
          created_at: string
          email: string
          full_name: string
          monthly_price: number
          plan: Database["public"]["Enums"]["plan_type"]
          transaction_fee_percent: number
          user_id: string
        }[]
      }
      admin_saas_metrics: {
        Args: never
        Returns: {
          enterprise_users: number
          free_users: number
          pro_users: number
          total_orders: number
          total_products: number
          total_revenue: number
          total_stores: number
          total_users: number
        }[]
      }
      admin_toggle_user_block: {
        Args: { _blocked: boolean; _target_user_id: string }
        Returns: undefined
      }
      admin_update_user_fee: {
        Args: { _new_fee: number; _target_user_id: string }
        Returns: undefined
      }
      admin_update_user_plan: {
        Args: {
          _new_plan: Database["public"]["Enums"]["plan_type"]
          _target_user_id: string
        }
        Returns: undefined
      }
      admin_update_user_profile: {
        Args: { _full_name: string; _target_user_id: string }
        Returns: undefined
      }
      admin_user_details: {
        Args: { _target_user_id: string }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          monthly_price: number
          plan: Database["public"]["Enums"]["plan_type"]
          total_orders: number
          total_paid_orders: number
          total_pending_revenue: number
          total_products: number
          total_revenue: number
          total_stores: number
          transaction_fee_percent: number
          user_created_at: string
          user_id: string
        }[]
      }
      admin_user_products: {
        Args: { _target_user_id: string }
        Returns: {
          active: boolean
          created_at: string
          original_price: number
          product_id: string
          sale_price: number
          slug: string
          thumbnail_url: string
          title: string
          total_orders: number
          total_paid_orders: number
          total_pending_revenue: number
          total_revenue: number
        }[]
      }
      get_user_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["plan_type"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_pix_copied: { Args: { _order_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      plan_type: "free" | "pro" | "enterprise"
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
      app_role: ["admin", "moderator", "user"],
      plan_type: ["free", "pro", "enterprise"],
    },
  },
} as const
