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
      assets: {
        Row: {
          auto_update: boolean
          conversion_rate: number | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          price_per_unit: number
          quantity: number
          total_value: number | null
          type: string
          unit: string
          user_id: string
        }
        Insert: {
          auto_update?: boolean
          conversion_rate?: number | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          id?: string
          price_per_unit: number
          quantity: number
          total_value?: number | null
          type: string
          unit: string
          user_id: string
        }
        Update: {
          auto_update?: boolean
          conversion_rate?: number | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          price_per_unit?: number
          quantity?: number
          total_value?: number | null
          type?: string
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          company: string | null
          address: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      debt_amount_history: {
        Row: {
          amount: number
          debt_id: string
          id: string
          logged_at: string
          note: string
          user_id: string
        }
        Insert: {
          amount: number
          debt_id: string
          id?: string
          logged_at?: string
          note?: string
          user_id: string
        }
        Update: {
          amount?: number
          debt_id?: string
          id?: string
          logged_at?: string
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_amount_history_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          amount: number
          created_at: string
          creditor: string
          currency: Database["public"]["Enums"]["currency_code"]
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["debt_status"]
          title: string
          type: Database["public"]["Enums"]["debt_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          creditor: string
          currency: Database["public"]["Enums"]["currency_code"]
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["debt_status"]
          title: string
          type: Database["public"]["Enums"]["debt_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          creditor?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["debt_status"]
          title?: string
          type?: Database["public"]["Enums"]["debt_type"]
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          date: string
          id: string
          status: Database["public"]["Enums"]["expense_status"]
          title: string
          type: Database["public"]["Enums"]["expense_type"]
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          client_id?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          date: string
          id?: string
          status?: Database["public"]["Enums"]["expense_status"]
          title: string
          type: Database["public"]["Enums"]["expense_type"]
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          date?: string
          id?: string
          status?: Database["public"]["Enums"]["expense_status"]
          title?: string
          type?: Database["public"]["Enums"]["expense_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      income_amount_history: {
        Row: {
          amount: number
          id: string
          income_id: string
          logged_at: string
          note: string
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          income_id: string
          logged_at?: string
          note?: string
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          income_id?: string
          logged_at?: string
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_amount_history_income_id_fkey"
            columns: ["income_id"]
            isOneToOne: false
            referencedRelation: "incomes"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          date: string
          id: string
          status: Database["public"]["Enums"]["income_status"]
          title: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          client_id?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          date: string
          id?: string
          status?: Database["public"]["Enums"]["income_status"]
          title: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          date?: string
          id?: string
          status?: Database["public"]["Enums"]["income_status"]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          user_id: string
          description: string
          quantity: number
          unit_price: number
          amount: number | null
          sort_order: number
        }
        Insert: {
          id?: string
          invoice_id: string
          user_id: string
          description: string
          quantity?: number
          unit_price: number
          sort_order?: number
        }
        Update: {
          id?: string
          invoice_id?: string
          user_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          client_id: string
          invoice_number: string
          status: Database["public"]["Enums"]["invoice_status"]
          currency: Database["public"]["Enums"]["currency_code"]
          issue_date: string
          due_date: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number | null
          total: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          invoice_number: string
          status?: Database["public"]["Enums"]["invoice_status"]
          currency?: Database["public"]["Enums"]["currency_code"]
          issue_date: string
          due_date?: string | null
          subtotal?: number
          tax_rate?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string
          invoice_number?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          currency?: Database["public"]["Enums"]["currency_code"]
          issue_date?: string
          due_date?: string | null
          subtotal?: number
          tax_rate?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      recent_activity: {
        Row: {
          action: string
          description: string
          id: string
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          action: string
          description: string
          id?: string
          timestamp?: string
          type: string
          user_id: string
        }
        Update: {
          action?: string
          description?: string
          id?: string
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          app_mode: string
          auto_convert: boolean
          auto_price_update: boolean
          default_currency: Database["public"]["Enums"]["currency_code"]
          include_long_term: boolean
          language: string
          net_worth_calculation: string
          theme: string
          user_id: string
        }
        Insert: {
          app_mode?: string
          auto_convert?: boolean
          auto_price_update?: boolean
          default_currency?: Database["public"]["Enums"]["currency_code"]
          include_long_term?: boolean
          language?: string
          net_worth_calculation?: string
          theme?: string
          user_id: string
        }
        Update: {
          app_mode?: string
          auto_convert?: boolean
          auto_price_update?: boolean
          default_currency?: Database["public"]["Enums"]["currency_code"]
          include_long_term?: boolean
          language?: string
          net_worth_calculation?: string
          theme?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_debt_amount: {
        Args: { in_debt_id: string; in_new_amount: number; in_note?: string }
        Returns: undefined
      }
      update_income_amount: {
        Args: { in_income_id: string; in_new_amount: number; in_note?: string }
        Returns: undefined
      }
    }
    Enums: {
      currency_code: "USD" | "TRY"
      debt_status: "pending" | "paid"
      debt_type: "short" | "long"
      expense_status: "paid" | "pending"
      expense_type: "fixed" | "variable"
      income_status: "expected" | "received"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
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
      currency_code: ["USD", "TRY"],
      debt_status: ["pending", "paid"],
      debt_type: ["short", "long"],
      expense_status: ["paid", "pending"],
      expense_type: ["fixed", "variable"],
      income_status: ["expected", "received"],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
    },
  },
} as const
