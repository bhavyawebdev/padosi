export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          neighbourhood: string | null;
          latitude: number | null;
          longitude: number | null;
          location_radius: number;
          neighbour_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          neighbourhood?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location_radius?: number;
          neighbour_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          neighbourhood?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location_radius?: number;
          neighbour_score?: number;
          updated_at?: string;
        };
      };
      nearby_posts: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          category: string;
          images: string[];
          latitude: number | null;
          longitude: number | null;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          category: string;
          images?: string[];
          latitude?: number | null;
          longitude?: number | null;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          category?: string;
          images?: string[];
          latitude?: number | null;
          longitude?: number | null;
          expires_at?: string;
          updated_at?: string;
        };
      };
      help_profiles: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          description: string;
          is_verified: boolean;
          rating: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          description: string;
          is_verified?: boolean;
          rating?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          description?: string;
          is_verified?: boolean;
          rating?: number;
          updated_at?: string;
        };
      };
      help_requests: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          category: string;
          status: string;
          latitude: number | null;
          longitude: number | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          category: string;
          status?: string;
          latitude?: number | null;
          longitude?: number | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          category?: string;
          status?: string;
          latitude?: number | null;
          longitude?: number | null;
          expires_at?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
