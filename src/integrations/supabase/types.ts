export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          location?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_types: {
        Row: {
          id: string
          name: string
          icon: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          icon: string
          created_at?: string
        }
        Update: {
          name?: string
          icon?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          task_type_id: string
          duration_seconds: number
          photo_url: string | null
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_type_id: string
          duration_seconds: number
          photo_url?: string | null
          completed_at?: string
          created_at?: string
        }
        Update: {
          duration_seconds?: number
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_task_type_id_fkey"
            columns: ["task_type_id"]
            isOneToOne: false
            referencedRelation: "task_types"
            referencedColumns: ["id"]
          }
        ]
      }
      task_likes: {
        Row: {
          id: string
          task_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_likes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_relationships: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_relationships_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_relationships_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      achievements: {
        Row: {
          id: string
          user_id: string
          badge_name: string
          badge_type: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_name: string
          badge_type: string
          earned_at?: string
        }
        Update: {
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'user'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'user'
          created_at?: string
        }
        Update: {
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      waitlist: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: 'admin' | 'user'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type TaskType = Database['public']['Tables']['task_types']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskLike = Database['public']['Tables']['task_likes']['Row']
export type UserRelationship = Database['public']['Tables']['user_relationships']['Row']
export type Achievement = Database['public']['Tables']['achievements']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']
export type WaitlistEntry = Database['public']['Tables']['waitlist']['Row']
