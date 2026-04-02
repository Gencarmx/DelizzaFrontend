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
      carts: {
        Row: {
          id: string
          user_id: string
          items: Json
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          items?: Json
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          items?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          active: boolean
          business_id: string
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          open_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          close_time: string
          created_at?: string
          day_of_week: number
          id: string
          open_time: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          open_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_business_hours_business"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          id: string
          profile_id: string
          label: string
          line1: string
          line2: string | null
          city: string
          state: string
          postal_code: string | null
          country: string
          recipient_name: string | null
          phone: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          label: string
          line1: string
          line2?: string | null
          city: string
          state: string
          postal_code?: string | null
          country: string
          recipient_name?: string | null
          phone?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          label?: string
          line1?: string
          line2?: string | null
          city?: string
          state?: string
          postal_code?: string | null
          country?: string
          recipient_name?: string | null
          phone?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          active: boolean | null
          address: string | null
          created_at: string | null
          delivery_fee: number
          has_delivery: boolean
          has_pickup: boolean
          id: string
          is_paused: boolean
          logo_url: string | null
          min_order_amount: number
          name: string
          owner_id: string
          owner_user_id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          delivery_fee?: number
          has_delivery?: boolean
          has_pickup?: boolean
          id?: string
          is_paused?: boolean
          logo_url?: string | null
          min_order_amount?: number
          name: string
          owner_id: string
          owner_user_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          delivery_fee?: number
          has_delivery?: boolean
          has_pickup?: boolean
          id?: string
          is_paused?: boolean
          logo_url?: string | null
          min_order_amount?: number
          name?: string
          owner_id?: string
          owner_user_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          active: boolean | null
          business_id: string | null
          created_at: string | null
          id: string
          invited_by: string | null
          role: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          order_id: string | null
          price: number
          product_id: string | null
          product_name: string | null
          quantity: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          price: number
          product_id?: string | null
          product_name?: string | null
          quantity: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          price?: number
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          updated_at?: string | null
        }

        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          active: boolean | null
          assigned_driver_id: string | null
          business_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          delivery_type: string | null
          id: string
          payment_method: string | null
          status: string | null
          total: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          assigned_driver_id?: string | null
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          delivery_type?: string | null
          id?: string
          payment_method?: string | null
          status?: string | null
          total: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          assigned_driver_id?: string | null
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          delivery_type?: string | null
          id?: string
          payment_method?: string | null
          status?: string | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_verifications: {
        Row: {
          active: boolean | null
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          otp_hash: string
          phone_number: string
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          active?: boolean | null
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          otp_hash: string
          phone_number: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          active?: boolean | null
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          otp_hash?: string
          phone_number?: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          active: boolean | null
          amount: number
          created_at: string | null
          id: string
          method: string | null
          order_id: string | null
          paid_at: string | null
          status: string | null
        }
        Insert: {
          active?: boolean | null
          amount: number
          created_at?: string | null
          id?: string
          method?: string | null
          order_id?: string | null
          paid_at?: string | null
          status?: string | null
        }
        Update: {
          active?: boolean | null
          amount?: number
          created_at?: string | null
          id?: string
          method?: string | null
          order_id?: string | null
          paid_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_addons: {
        Row: {
          id: string
          product_id: string
          category_name: string
          name: string
          price: number
          max_quantity: number
          sort_order: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          category_name: string
          name: string
          price?: number
          max_quantity?: number
          sort_order?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          category_name?: string
          name?: string
          price?: number
          max_quantity?: number
          sort_order?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          business_id: string
          category_id: string | null
          created_at: string | null
          description: string | null
          has_addons: boolean
          id: string
          image_url: string | null
          name: string
          price: number
          stock: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          has_addons?: boolean
          id?: string
          image_url?: string | null
          name: string
          price: number
          stock?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          has_addons?: boolean
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          full_name: string | null
          id: string
          phone_number: string
          updated_at: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone_number: string
          updated_at?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string
          updated_at?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_product_addons_grouped: {
        Args: { p_product_id: string }
        Returns: Json
      }
      get_products_addons: {
        Args: { p_product_ids: string[] }
        Returns: { product_id: string; addons: Json }[]
      }
      upsert_product_addons: {
        Args: { p_product_id: string; p_addons: Json }
        Returns: void
      }
      get_top_businesses_with_products: {
        Args: {
          p_current_time: string
          p_day_of_week: number
          p_limit?: number
          p_products_per_business?: number
        }
        Returns: {
          address: string
          business_id: string
          business_name: string
          logo_url: string
          products: Json
        }[]
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
    Enums: {},
  },
} as const

// ─── Tipos de dominio: Sistema de Extras ─────────────────────────────────────

export interface ProductAddon {
  id: string;
  product_id: string;
  category_name: string;
  name: string;
  price: number;
  max_quantity: number;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddonItem {
  id: string;
  name: string;
  price: number;
  max_quantity: number;
  sort_order: number;
}

export interface AddonGroup {
  category: string;
  addons: AddonItem[];
}

export interface SelectedAddon {
  addon_id: string;
  name: string;
  price: number;
  quantity: number;
}
