export interface Scene {
  scene_number: number;
  title: string;
  duration_min: number;
  duration_seconds?: number;
  image_prompt: string;
  motion_prompt?: string;
  voice_script: string;
  capcut_note: string;
  transition?: string;
  sound_effect?: string;
  interaction_type?: string;
  interaction_target?: string;
  character?: string;
  background_setting?: string;
}

export interface Grade {
  id: string;
  name: string;
  level: number;
  created_at?: string;
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface ProductionKit {
  id: string;
  module_id: string;
  scenes: Scene[];
  status: 'draft' | 'ready' | 'archived';
  created_at: string;
  grade_id?: string;
  modules?: { filename: string; metadata: any };
  answer_key?: Array<{
    question_number: number;
    correct_answer: string;
    max_score: number;
  }>;
}

export interface Student {
  id: string;
  full_name: string;
  current_level: number;
  parent_name: string;
  parent_phone: string;
  enrolled_at: string;
  status: 'active' | 'inactive';
  grade_id?: string;
  program_id?: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  session_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
}

export interface Assessment {
  id: string;
  student_id: string;
  session_id: string;
  rubric_scores: Record<string, number>;
  total_score: number;
  tutor_notes: string;
}

export interface User {
  id: string;
  username: string;
  password_hash?: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'tutor';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface UserFormData {
  username: string;
  password?: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'tutor';
  status?: 'active' | 'inactive';
}

export interface Session {
  id: string;
  episode_id: string;
  target_level: 'pemula' | 'menengah' | 'lanjut';
  title: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  capacity?: number;
  notes?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  tutor_id?: string;
  created_at?: string;
  updated_at?: string;
  episodes?: {
    episode_number: number;
    title: string;
    terdig_level: string;
  };
}

export interface Invoice {
  id: string;
  student_id: string;
  period: string; // 'YYYY-MM'
  amount: number;
  status: 'unpaid' | 'partial' | 'paid' | 'cancelled';
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Kolom hitungan dari API
  paid_total?: number;
  remaining?: number;
  students?: {
    id: string;
    full_name: string;
    parent_name?: string;
    parent_phone?: string;
    status?: string;
    grades?: { name: string } | null;
    programs?: { name: string } | null;
  };
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: 'qris' | 'transfer' | 'cash' | 'other';
  paid_at: string;
  note?: string | null;
  recorded_by?: string | null;
  created_at?: string;
  users?: { id: string; username: string; full_name: string } | null;
}

export interface ActivityLink {
  type: 'game' | 'quiz' | 'activity' | 'song' | 'resource';
  label: string;
  url: string;
}

export interface Episode {
  id: string;
  episode_number: number;
  title: string;
  terdig_level: 'pemula' | 'menengah' | 'lanjut';
  roadmap_level: number;
  youtube_url?: string;
  youtube_urls?: string[];
  duration_minutes?: number;
  target_age?: string;
  theme?: string;
  keyword_seo?: string;
  facilitator_guide_url?: string;
  worksheet_url?: string;
  song_url?: string;
  thumbnail_url?: string;
  rubric?: RubricCriteria[];
  activity_links?: ActivityLink[];
  status: 'not_started' | 'in_progress' | 'published' | 'archived';
  published_at?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RubricCriteria {
  name: string;
  max_score: number;
}

export interface EpisodeFormData {
  episode_number: number;
  title: string;
  terdig_level: 'pemula' | 'menengah' | 'lanjut';
  roadmap_level: number;
  youtube_url?: string;
  youtube_urls?: string[];
  duration_minutes?: number;
  target_age?: string;
  theme?: string;
  keyword_seo?: string;
  notes?: string;
  rubric?: RubricCriteria[];
  activity_links?: ActivityLink[];
}

export interface Parent {
  id: string;
  student_id: string;
  parent_name: string;
  phone_number: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  is_primary: boolean;
  receive_whatsapp: boolean;
  last_report_sent_at: string | null;
  created_at: string;
  updated_at: string;
  // Optional join
  students?: Student;
}

export interface ParentFormData {
  student_id: string;
  parent_name: string;
  phone_number: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  is_primary: boolean;
  receive_whatsapp: boolean;
}

export interface ParentReport {
  id: string;
  student_id: string;
  session_id: string;
  parent_id: string | null;
  report_type: string;
  content_json: { text: string };
  wa_status: 'pending' | 'sent' | 'failed';
  created_at: string;
  updated_at?: string;
  // Optional joins
  students?: Student;
  sessions?: Session;
  parents?: Parent;
}

export interface WorksheetSubmission {
  id: string;
  student_id: string;
  session_id: string;
  image_url: string;
  extracted_text?: string;
  ai_correction?: {
    answers: Array<{
      question_number: number;
      student_answer: string;
      correct_answer: string;
      is_correct: boolean;
      score: number;
      max_score: number;
      comment: string;
    }>;
    total_score: number;
    max_total: number;
    summary: string;
  };
  score?: number;
  confidence?: number;
  tutor_reviewed: boolean;
  created_at: string;
}
