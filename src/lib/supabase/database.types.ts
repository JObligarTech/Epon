/**
 * Hand-written to match supabase/migrations. Once the project is linked, this
 * should be replaced by `supabase gen types typescript --linked`, which
 * generates it from the live schema and cannot drift.
 */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
        };
        Update: {
          full_name?: string | null;
          email?: string;
        };
      };
      items: {
        Row: {
          id: string;
          user_id: string;
          plaid_item_id: string;
          plaid_institution_id: string;
          institution_name: string;
          access_token_encrypted: string | null;
          hue_index: number;
          status: "healthy" | "reconnect_required";
          sync_cursor: string | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          plaid_item_id: string;
          plaid_institution_id: string;
          institution_name: string;
          access_token_encrypted?: string | null;
          hue_index: number;
          status?: "healthy" | "reconnect_required";
          sync_cursor?: string | null;
          last_synced_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["items"]["Insert"]>;
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          plaid_account_id: string;
          name: string;
          mask: string | null;
          type: "checking" | "savings" | "credit";
          current_balance_minor: number;
          available_balance_minor: number | null;
          credit_limit_minor: number | null;
          apy: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["accounts"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          plaid_transaction_id: string;
          merchant_name: string;
          amount_minor: number;
          occurred_at: string;
          status: "pending" | "posted";
          category: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["transactions"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
      };
    };
  };
};

export type ItemRow = Database["public"]["Tables"]["items"]["Row"];
export type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
