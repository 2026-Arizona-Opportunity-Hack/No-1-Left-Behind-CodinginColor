import type { Module } from "./curriculum";
export type Class = { id: string; name: string; school: string; class_code: string; instructor_id: string | null; created_at: string };
export type StudentLabel = { id: string; display_name: string; label: string };
export type ClassSession = { id: string; class_id: string; session_date: string; lesson_id: string | null };
export type ClassSetup = { class: Class; students: StudentLabel[]; modules: (Module & { assigned_at: string })[]; sessions: ClassSession[] };
