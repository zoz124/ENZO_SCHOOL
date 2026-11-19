import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en');
  CREATE TYPE "public"."enum_teachers_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum__teachers_v_version_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_exams_status" AS ENUM('active', 'archived');
  CREATE TYPE "public"."enum__exams_v_version_status" AS ENUM('active', 'archived');
  CREATE TYPE "public"."enum_exam_attempts_status" AS ENUM('in-progress', 'submitted', 'auto-submitted');
  CREATE TYPE "public"."enum__exam_attempts_v_version_status" AS ENUM('in-progress', 'submitted', 'auto-submitted');
  CREATE TYPE "public"."enum_payload_llm_instructions_entity_type" AS ENUM('collection', 'global');
  CREATE TABLE "admins_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"refresh_count" numeric,
  	"refreshed_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "admins" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "admins_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"_h_folders_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"_stored" boolean,
  	"_transforms" jsonb,
  	"original_filename" varchar,
  	"original_url" varchar,
  	"original_mime_type" varchar,
  	"original_filesize" numeric,
  	"original_width" numeric,
  	"original_height" numeric,
  	"original_prefix" varchar,
  	"original__objectkey" varchar,
  	"original__stored" boolean,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "media_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "_media_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_alt" varchar NOT NULL,
  	"version__h_folders_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_url" varchar,
  	"version_thumbnail_u_r_l" varchar,
  	"version_filename" varchar,
  	"version_mime_type" varchar,
  	"version_filesize" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version__stored" boolean,
  	"version__transforms" jsonb,
  	"version_original_filename" varchar,
  	"version_original_url" varchar,
  	"version_original_mime_type" varchar,
  	"version_original_filesize" numeric,
  	"version_original_width" numeric,
  	"version_original_height" numeric,
  	"version_original_prefix" varchar,
  	"version_original__objectkey" varchar,
  	"version_original__stored" boolean,
  	"version_focal_x" numeric,
  	"version_focal_y" numeric,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_media_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "folders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_h_folders_id" integer,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "folders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "_folders_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__h_folders_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_folders_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_h_tags_id" integer,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tags_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "_tags_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__h_tags_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_tags_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "teachers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"refresh_count" numeric,
  	"refreshed_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "teachers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"subject" varchar,
  	"status" "enum_teachers_status" DEFAULT 'pending' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "teachers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "_teachers_v_version_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"refresh_count" numeric,
  	"refreshed_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_teachers_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_subject" varchar,
  	"version_status" "enum__teachers_v_version_status" DEFAULT 'pending' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_email" varchar NOT NULL,
  	"version_reset_password_token" varchar,
  	"version_reset_password_expiration" timestamp(3) with time zone,
  	"version_salt" varchar,
  	"version_hash" varchar,
  	"version_reset_password_requested_at" timestamp(3) with time zone,
  	"version_login_attempts" numeric DEFAULT 0,
  	"version_lock_until" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_teachers_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "exams_questions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "exams_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"prompt" varchar NOT NULL,
  	"correct_option" numeric NOT NULL,
  	"points" numeric DEFAULT 1 NOT NULL
  );
  
  CREATE TABLE "exams" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"subject" varchar NOT NULL,
  	"description" varchar,
  	"duration_minutes" numeric NOT NULL,
  	"status" "enum_exams_status" DEFAULT 'active' NOT NULL,
  	"code" varchar NOT NULL,
  	"owner_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "exams_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "_exams_v_version_questions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_exams_v_version_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"prompt" varchar NOT NULL,
  	"correct_option" numeric NOT NULL,
  	"points" numeric DEFAULT 1 NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_exams_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar NOT NULL,
  	"version_subject" varchar NOT NULL,
  	"version_description" varchar,
  	"version_duration_minutes" numeric NOT NULL,
  	"version_status" "enum__exams_v_version_status" DEFAULT 'active' NOT NULL,
  	"version_code" varchar NOT NULL,
  	"version_owner_id" integer NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_exams_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "exam_attempts_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question_id" varchar NOT NULL,
  	"selected_option" numeric NOT NULL,
  	"is_correct" boolean
  );
  
  CREATE TABLE "exam_attempts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"student_name" varchar NOT NULL,
  	"exam_id" integer NOT NULL,
  	"teacher_id" integer NOT NULL,
  	"submission_token" varchar NOT NULL,
  	"status" "enum_exam_attempts_status" DEFAULT 'in-progress' NOT NULL,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"submitted_at" timestamp(3) with time zone,
  	"duration_seconds" numeric DEFAULT 0,
  	"score" numeric DEFAULT 0 NOT NULL,
  	"max_score" numeric DEFAULT 0 NOT NULL,
  	"wrong_count" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "exam_attempts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "_exam_attempts_v_version_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question_id" varchar NOT NULL,
  	"selected_option" numeric NOT NULL,
  	"is_correct" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_exam_attempts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_student_name" varchar NOT NULL,
  	"version_exam_id" integer NOT NULL,
  	"version_teacher_id" integer NOT NULL,
  	"version_submission_token" varchar NOT NULL,
  	"version_status" "enum__exam_attempts_v_version_status" DEFAULT 'in-progress' NOT NULL,
  	"version_started_at" timestamp(3) with time zone NOT NULL,
  	"version_submitted_at" timestamp(3) with time zone,
  	"version_duration_seconds" numeric DEFAULT 0,
  	"version_score" numeric DEFAULT 0 NOT NULL,
  	"version_max_score" numeric DEFAULT 0 NOT NULL,
  	"version_wrong_count" numeric DEFAULT 0 NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_exam_attempts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"media_id" integer,
  	"folders_id" integer,
  	"tags_id" integer,
  	"teachers_id" integer,
  	"exams_id" integer,
  	"exam_attempts_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_llm_instructions" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"entity_slug" varchar NOT NULL,
  	"entity_type" "enum_payload_llm_instructions_entity_type" NOT NULL,
  	"additional_instructions" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_llm_instructions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" varchar NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"teachers_id" integer
  );
  
  ALTER TABLE "admins_sessions" ADD CONSTRAINT "admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admins_rels" ADD CONSTRAINT "admins_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admins_rels" ADD CONSTRAINT "admins_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admins_rels" ADD CONSTRAINT "admins_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media__h_folders_id_folders_id_fk" FOREIGN KEY ("_h_folders_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v" ADD CONSTRAINT "_media_v_parent_id_media_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_v" ADD CONSTRAINT "_media_v_version__h_folders_id_folders_id_fk" FOREIGN KEY ("version__h_folders_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_media_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "folders" ADD CONSTRAINT "folders__h_folders_id_folders_id_fk" FOREIGN KEY ("_h_folders_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "folders_rels" ADD CONSTRAINT "folders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "folders_rels" ADD CONSTRAINT "folders_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "folders_rels" ADD CONSTRAINT "folders_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_folders_v" ADD CONSTRAINT "_folders_v_parent_id_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_folders_v" ADD CONSTRAINT "_folders_v_version__h_folders_id_folders_id_fk" FOREIGN KEY ("version__h_folders_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_folders_v_rels" ADD CONSTRAINT "_folders_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_folders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_folders_v_rels" ADD CONSTRAINT "_folders_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_folders_v_rels" ADD CONSTRAINT "_folders_v_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags" ADD CONSTRAINT "tags__h_tags_id_tags_id_fk" FOREIGN KEY ("_h_tags_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tags_rels" ADD CONSTRAINT "tags_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags_rels" ADD CONSTRAINT "tags_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags_rels" ADD CONSTRAINT "tags_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tags_v" ADD CONSTRAINT "_tags_v_parent_id_tags_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tags_v" ADD CONSTRAINT "_tags_v_version__h_tags_id_tags_id_fk" FOREIGN KEY ("version__h_tags_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tags_v_rels" ADD CONSTRAINT "_tags_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tags_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tags_v_rels" ADD CONSTRAINT "_tags_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tags_v_rels" ADD CONSTRAINT "_tags_v_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "teachers_sessions" ADD CONSTRAINT "teachers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "teachers_rels" ADD CONSTRAINT "teachers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "teachers_rels" ADD CONSTRAINT "teachers_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "teachers_rels" ADD CONSTRAINT "teachers_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_teachers_v_version_sessions" ADD CONSTRAINT "_teachers_v_version_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_teachers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_teachers_v" ADD CONSTRAINT "_teachers_v_parent_id_teachers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_teachers_v_rels" ADD CONSTRAINT "_teachers_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_teachers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_teachers_v_rels" ADD CONSTRAINT "_teachers_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_teachers_v_rels" ADD CONSTRAINT "_teachers_v_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exams_questions_options" ADD CONSTRAINT "exams_questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."exams_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exams_questions" ADD CONSTRAINT "exams_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exams" ADD CONSTRAINT "exams_owner_id_teachers_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exams_rels" ADD CONSTRAINT "exams_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exams_rels" ADD CONSTRAINT "exams_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exams_rels" ADD CONSTRAINT "exams_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exams_v_version_questions_options" ADD CONSTRAINT "_exams_v_version_questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_exams_v_version_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exams_v_version_questions" ADD CONSTRAINT "_exams_v_version_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_exams_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exams_v" ADD CONSTRAINT "_exams_v_parent_id_exams_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."exams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_exams_v" ADD CONSTRAINT "_exams_v_version_owner_id_teachers_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_exams_v_rels" ADD CONSTRAINT "_exams_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_exams_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exams_v_rels" ADD CONSTRAINT "_exams_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exams_v_rels" ADD CONSTRAINT "_exams_v_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exam_attempts_answers" ADD CONSTRAINT "exam_attempts_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exam_attempts_rels" ADD CONSTRAINT "exam_attempts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exam_attempts_rels" ADD CONSTRAINT "exam_attempts_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exam_attempts_rels" ADD CONSTRAINT "exam_attempts_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exam_attempts_v_version_answers" ADD CONSTRAINT "_exam_attempts_v_version_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_exam_attempts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exam_attempts_v" ADD CONSTRAINT "_exam_attempts_v_parent_id_exam_attempts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."exam_attempts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_exam_attempts_v" ADD CONSTRAINT "_exam_attempts_v_version_exam_id_exams_id_fk" FOREIGN KEY ("version_exam_id") REFERENCES "public"."exams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_exam_attempts_v" ADD CONSTRAINT "_exam_attempts_v_version_teacher_id_teachers_id_fk" FOREIGN KEY ("version_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_exam_attempts_v_rels" ADD CONSTRAINT "_exam_attempts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_exam_attempts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exam_attempts_v_rels" ADD CONSTRAINT "_exam_attempts_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exam_attempts_v_rels" ADD CONSTRAINT "_exam_attempts_v_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_folders_fk" FOREIGN KEY ("folders_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_exams_fk" FOREIGN KEY ("exams_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_exam_attempts_fk" FOREIGN KEY ("exam_attempts_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_llm_instructions_rels" ADD CONSTRAINT "payload_llm_instructions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_llm_instructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_llm_instructions_rels" ADD CONSTRAINT "payload_llm_instructions_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_llm_instructions_rels" ADD CONSTRAINT "payload_llm_instructions_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "admins_sessions_order_idx" ON "admins_sessions" USING btree ("_order");
  CREATE INDEX "admins_sessions_parent_id_idx" ON "admins_sessions" USING btree ("_parent_id");
  CREATE INDEX "admins_updated_at_idx" ON "admins" USING btree ("updated_at");
  CREATE INDEX "admins_created_at_idx" ON "admins" USING btree ("created_at");
  CREATE UNIQUE INDEX "admins_email_idx" ON "admins" USING btree ("email");
  CREATE INDEX "admins_rels_order_idx" ON "admins_rels" USING btree ("order");
  CREATE INDEX "admins_rels_parent_idx" ON "admins_rels" USING btree ("parent_id");
  CREATE INDEX "admins_rels_path_idx" ON "admins_rels" USING btree ("path");
  CREATE INDEX "admins_rels_admins_id_idx" ON "admins_rels" USING btree ("admins_id");
  CREATE INDEX "admins_rels_teachers_id_idx" ON "admins_rels" USING btree ("teachers_id");
  CREATE INDEX "media__h_folders_idx" ON "media" USING btree ("_h_folders_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_original_original_filename_idx" ON "media" USING btree ("original_filename");
  CREATE INDEX "media_rels_order_idx" ON "media_rels" USING btree ("order");
  CREATE INDEX "media_rels_parent_idx" ON "media_rels" USING btree ("parent_id");
  CREATE INDEX "media_rels_path_idx" ON "media_rels" USING btree ("path");
  CREATE INDEX "media_rels_tags_id_idx" ON "media_rels" USING btree ("tags_id");
  CREATE INDEX "media_rels_admins_id_idx" ON "media_rels" USING btree ("admins_id");
  CREATE INDEX "media_rels_teachers_id_idx" ON "media_rels" USING btree ("teachers_id");
  CREATE INDEX "_media_v_parent_idx" ON "_media_v" USING btree ("parent_id");
  CREATE INDEX "_media_v_version_version__h_folders_idx" ON "_media_v" USING btree ("version__h_folders_id");
  CREATE INDEX "_media_v_version_version_updated_at_idx" ON "_media_v" USING btree ("version_updated_at");
  CREATE INDEX "_media_v_version_version_created_at_idx" ON "_media_v" USING btree ("version_created_at");
  CREATE INDEX "_media_v_version_version_filename_idx" ON "_media_v" USING btree ("version_filename");
  CREATE INDEX "_media_v_version_original_version_original_filename_idx" ON "_media_v" USING btree ("version_original_filename");
  CREATE INDEX "_media_v_created_at_idx" ON "_media_v" USING btree ("created_at");
  CREATE INDEX "_media_v_updated_at_idx" ON "_media_v" USING btree ("updated_at");
  CREATE INDEX "_media_v_rels_order_idx" ON "_media_v_rels" USING btree ("order");
  CREATE INDEX "_media_v_rels_parent_idx" ON "_media_v_rels" USING btree ("parent_id");
  CREATE INDEX "_media_v_rels_path_idx" ON "_media_v_rels" USING btree ("path");
  CREATE INDEX "_media_v_rels_tags_id_idx" ON "_media_v_rels" USING btree ("tags_id");
  CREATE INDEX "_media_v_rels_admins_id_idx" ON "_media_v_rels" USING btree ("admins_id");
  CREATE INDEX "_media_v_rels_teachers_id_idx" ON "_media_v_rels" USING btree ("teachers_id");
  CREATE INDEX "folders__h_folders_idx" ON "folders" USING btree ("_h_folders_id");
  CREATE INDEX "folders_updated_at_idx" ON "folders" USING btree ("updated_at");
  CREATE INDEX "folders_created_at_idx" ON "folders" USING btree ("created_at");
  CREATE INDEX "folders_rels_order_idx" ON "folders_rels" USING btree ("order");
  CREATE INDEX "folders_rels_parent_idx" ON "folders_rels" USING btree ("parent_id");
  CREATE INDEX "folders_rels_path_idx" ON "folders_rels" USING btree ("path");
  CREATE INDEX "folders_rels_admins_id_idx" ON "folders_rels" USING btree ("admins_id");
  CREATE INDEX "folders_rels_teachers_id_idx" ON "folders_rels" USING btree ("teachers_id");
  CREATE INDEX "_folders_v_parent_idx" ON "_folders_v" USING btree ("parent_id");
  CREATE INDEX "_folders_v_version_version__h_folders_idx" ON "_folders_v" USING btree ("version__h_folders_id");
  CREATE INDEX "_folders_v_version_version_updated_at_idx" ON "_folders_v" USING btree ("version_updated_at");
  CREATE INDEX "_folders_v_version_version_created_at_idx" ON "_folders_v" USING btree ("version_created_at");
  CREATE INDEX "_folders_v_created_at_idx" ON "_folders_v" USING btree ("created_at");
  CREATE INDEX "_folders_v_updated_at_idx" ON "_folders_v" USING btree ("updated_at");
  CREATE INDEX "_folders_v_rels_order_idx" ON "_folders_v_rels" USING btree ("order");
  CREATE INDEX "_folders_v_rels_parent_idx" ON "_folders_v_rels" USING btree ("parent_id");
  CREATE INDEX "_folders_v_rels_path_idx" ON "_folders_v_rels" USING btree ("path");
  CREATE INDEX "_folders_v_rels_admins_id_idx" ON "_folders_v_rels" USING btree ("admins_id");
  CREATE INDEX "_folders_v_rels_teachers_id_idx" ON "_folders_v_rels" USING btree ("teachers_id");
  CREATE INDEX "tags__h_tags_idx" ON "tags" USING btree ("_h_tags_id");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  CREATE INDEX "tags_rels_order_idx" ON "tags_rels" USING btree ("order");
  CREATE INDEX "tags_rels_parent_idx" ON "tags_rels" USING btree ("parent_id");
  CREATE INDEX "tags_rels_path_idx" ON "tags_rels" USING btree ("path");
  CREATE INDEX "tags_rels_admins_id_idx" ON "tags_rels" USING btree ("admins_id");
  CREATE INDEX "tags_rels_teachers_id_idx" ON "tags_rels" USING btree ("teachers_id");
  CREATE INDEX "_tags_v_parent_idx" ON "_tags_v" USING btree ("parent_id");
  CREATE INDEX "_tags_v_version_version__h_tags_idx" ON "_tags_v" USING btree ("version__h_tags_id");
  CREATE INDEX "_tags_v_version_version_updated_at_idx" ON "_tags_v" USING btree ("version_updated_at");
  CREATE INDEX "_tags_v_version_version_created_at_idx" ON "_tags_v" USING btree ("version_created_at");
  CREATE INDEX "_tags_v_created_at_idx" ON "_tags_v" USING btree ("created_at");
  CREATE INDEX "_tags_v_updated_at_idx" ON "_tags_v" USING btree ("updated_at");
  CREATE INDEX "_tags_v_rels_order_idx" ON "_tags_v_rels" USING btree ("order");
  CREATE INDEX "_tags_v_rels_parent_idx" ON "_tags_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tags_v_rels_path_idx" ON "_tags_v_rels" USING btree ("path");
  CREATE INDEX "_tags_v_rels_admins_id_idx" ON "_tags_v_rels" USING btree ("admins_id");
  CREATE INDEX "_tags_v_rels_teachers_id_idx" ON "_tags_v_rels" USING btree ("teachers_id");
  CREATE INDEX "teachers_sessions_order_idx" ON "teachers_sessions" USING btree ("_order");
  CREATE INDEX "teachers_sessions_parent_id_idx" ON "teachers_sessions" USING btree ("_parent_id");
  CREATE INDEX "teachers_updated_at_idx" ON "teachers" USING btree ("updated_at");
  CREATE INDEX "teachers_created_at_idx" ON "teachers" USING btree ("created_at");
  CREATE UNIQUE INDEX "teachers_email_idx" ON "teachers" USING btree ("email");
  CREATE INDEX "teachers_rels_order_idx" ON "teachers_rels" USING btree ("order");
  CREATE INDEX "teachers_rels_parent_idx" ON "teachers_rels" USING btree ("parent_id");
  CREATE INDEX "teachers_rels_path_idx" ON "teachers_rels" USING btree ("path");
  CREATE INDEX "teachers_rels_admins_id_idx" ON "teachers_rels" USING btree ("admins_id");
  CREATE INDEX "teachers_rels_teachers_id_idx" ON "teachers_rels" USING btree ("teachers_id");
  CREATE INDEX "_teachers_v_version_sessions_order_idx" ON "_teachers_v_version_sessions" USING btree ("_order");
  CREATE INDEX "_teachers_v_version_sessions_parent_id_idx" ON "_teachers_v_version_sessions" USING btree ("_parent_id");
  CREATE INDEX "_teachers_v_parent_idx" ON "_teachers_v" USING btree ("parent_id");
  CREATE INDEX "_teachers_v_version_version_updated_at_idx" ON "_teachers_v" USING btree ("version_updated_at");
  CREATE INDEX "_teachers_v_version_version_created_at_idx" ON "_teachers_v" USING btree ("version_created_at");
  CREATE INDEX "_teachers_v_version_version_email_idx" ON "_teachers_v" USING btree ("version_email");
  CREATE INDEX "_teachers_v_created_at_idx" ON "_teachers_v" USING btree ("created_at");
  CREATE INDEX "_teachers_v_updated_at_idx" ON "_teachers_v" USING btree ("updated_at");
  CREATE INDEX "_teachers_v_rels_order_idx" ON "_teachers_v_rels" USING btree ("order");
  CREATE INDEX "_teachers_v_rels_parent_idx" ON "_teachers_v_rels" USING btree ("parent_id");
  CREATE INDEX "_teachers_v_rels_path_idx" ON "_teachers_v_rels" USING btree ("path");
  CREATE INDEX "_teachers_v_rels_admins_id_idx" ON "_teachers_v_rels" USING btree ("admins_id");
  CREATE INDEX "_teachers_v_rels_teachers_id_idx" ON "_teachers_v_rels" USING btree ("teachers_id");
  CREATE INDEX "exams_questions_options_order_idx" ON "exams_questions_options" USING btree ("_order");
  CREATE INDEX "exams_questions_options_parent_id_idx" ON "exams_questions_options" USING btree ("_parent_id");
  CREATE INDEX "exams_questions_order_idx" ON "exams_questions" USING btree ("_order");
  CREATE INDEX "exams_questions_parent_id_idx" ON "exams_questions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "exams_code_idx" ON "exams" USING btree ("code");
  CREATE INDEX "exams_owner_idx" ON "exams" USING btree ("owner_id");
  CREATE INDEX "exams_updated_at_idx" ON "exams" USING btree ("updated_at");
  CREATE INDEX "exams_created_at_idx" ON "exams" USING btree ("created_at");
  CREATE INDEX "exams_rels_order_idx" ON "exams_rels" USING btree ("order");
  CREATE INDEX "exams_rels_parent_idx" ON "exams_rels" USING btree ("parent_id");
  CREATE INDEX "exams_rels_path_idx" ON "exams_rels" USING btree ("path");
  CREATE INDEX "exams_rels_admins_id_idx" ON "exams_rels" USING btree ("admins_id");
  CREATE INDEX "exams_rels_teachers_id_idx" ON "exams_rels" USING btree ("teachers_id");
  CREATE INDEX "_exams_v_version_questions_options_order_idx" ON "_exams_v_version_questions_options" USING btree ("_order");
  CREATE INDEX "_exams_v_version_questions_options_parent_id_idx" ON "_exams_v_version_questions_options" USING btree ("_parent_id");
  CREATE INDEX "_exams_v_version_questions_order_idx" ON "_exams_v_version_questions" USING btree ("_order");
  CREATE INDEX "_exams_v_version_questions_parent_id_idx" ON "_exams_v_version_questions" USING btree ("_parent_id");
  CREATE INDEX "_exams_v_parent_idx" ON "_exams_v" USING btree ("parent_id");
  CREATE INDEX "_exams_v_version_version_code_idx" ON "_exams_v" USING btree ("version_code");
  CREATE INDEX "_exams_v_version_version_owner_idx" ON "_exams_v" USING btree ("version_owner_id");
  CREATE INDEX "_exams_v_version_version_updated_at_idx" ON "_exams_v" USING btree ("version_updated_at");
  CREATE INDEX "_exams_v_version_version_created_at_idx" ON "_exams_v" USING btree ("version_created_at");
  CREATE INDEX "_exams_v_created_at_idx" ON "_exams_v" USING btree ("created_at");
  CREATE INDEX "_exams_v_updated_at_idx" ON "_exams_v" USING btree ("updated_at");
  CREATE INDEX "_exams_v_rels_order_idx" ON "_exams_v_rels" USING btree ("order");
  CREATE INDEX "_exams_v_rels_parent_idx" ON "_exams_v_rels" USING btree ("parent_id");
  CREATE INDEX "_exams_v_rels_path_idx" ON "_exams_v_rels" USING btree ("path");
  CREATE INDEX "_exams_v_rels_admins_id_idx" ON "_exams_v_rels" USING btree ("admins_id");
  CREATE INDEX "_exams_v_rels_teachers_id_idx" ON "_exams_v_rels" USING btree ("teachers_id");
  CREATE INDEX "exam_attempts_answers_order_idx" ON "exam_attempts_answers" USING btree ("_order");
  CREATE INDEX "exam_attempts_answers_parent_id_idx" ON "exam_attempts_answers" USING btree ("_parent_id");
  CREATE INDEX "exam_attempts_exam_idx" ON "exam_attempts" USING btree ("exam_id");
  CREATE INDEX "exam_attempts_teacher_idx" ON "exam_attempts" USING btree ("teacher_id");
  CREATE INDEX "exam_attempts_updated_at_idx" ON "exam_attempts" USING btree ("updated_at");
  CREATE INDEX "exam_attempts_created_at_idx" ON "exam_attempts" USING btree ("created_at");
  CREATE INDEX "exam_attempts_rels_order_idx" ON "exam_attempts_rels" USING btree ("order");
  CREATE INDEX "exam_attempts_rels_parent_idx" ON "exam_attempts_rels" USING btree ("parent_id");
  CREATE INDEX "exam_attempts_rels_path_idx" ON "exam_attempts_rels" USING btree ("path");
  CREATE INDEX "exam_attempts_rels_admins_id_idx" ON "exam_attempts_rels" USING btree ("admins_id");
  CREATE INDEX "exam_attempts_rels_teachers_id_idx" ON "exam_attempts_rels" USING btree ("teachers_id");
  CREATE INDEX "_exam_attempts_v_version_answers_order_idx" ON "_exam_attempts_v_version_answers" USING btree ("_order");
  CREATE INDEX "_exam_attempts_v_version_answers_parent_id_idx" ON "_exam_attempts_v_version_answers" USING btree ("_parent_id");
  CREATE INDEX "_exam_attempts_v_parent_idx" ON "_exam_attempts_v" USING btree ("parent_id");
  CREATE INDEX "_exam_attempts_v_version_version_exam_idx" ON "_exam_attempts_v" USING btree ("version_exam_id");
  CREATE INDEX "_exam_attempts_v_version_version_teacher_idx" ON "_exam_attempts_v" USING btree ("version_teacher_id");
  CREATE INDEX "_exam_attempts_v_version_version_updated_at_idx" ON "_exam_attempts_v" USING btree ("version_updated_at");
  CREATE INDEX "_exam_attempts_v_version_version_created_at_idx" ON "_exam_attempts_v" USING btree ("version_created_at");
  CREATE INDEX "_exam_attempts_v_created_at_idx" ON "_exam_attempts_v" USING btree ("created_at");
  CREATE INDEX "_exam_attempts_v_updated_at_idx" ON "_exam_attempts_v" USING btree ("updated_at");
  CREATE INDEX "_exam_attempts_v_rels_order_idx" ON "_exam_attempts_v_rels" USING btree ("order");
  CREATE INDEX "_exam_attempts_v_rels_parent_idx" ON "_exam_attempts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_exam_attempts_v_rels_path_idx" ON "_exam_attempts_v_rels" USING btree ("path");
  CREATE INDEX "_exam_attempts_v_rels_admins_id_idx" ON "_exam_attempts_v_rels" USING btree ("admins_id");
  CREATE INDEX "_exam_attempts_v_rels_teachers_id_idx" ON "_exam_attempts_v_rels" USING btree ("teachers_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_admins_id_idx" ON "payload_locked_documents_rels" USING btree ("admins_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_folders_id_idx" ON "payload_locked_documents_rels" USING btree ("folders_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_teachers_id_idx" ON "payload_locked_documents_rels" USING btree ("teachers_id");
  CREATE INDEX "payload_locked_documents_rels_exams_id_idx" ON "payload_locked_documents_rels" USING btree ("exams_id");
  CREATE INDEX "payload_locked_documents_rels_exam_attempts_id_idx" ON "payload_locked_documents_rels" USING btree ("exam_attempts_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_admins_id_idx" ON "payload_preferences_rels" USING btree ("admins_id");
  CREATE INDEX "payload_preferences_rels_teachers_id_idx" ON "payload_preferences_rels" USING btree ("teachers_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "payload_llm_instructions_entity_slug_idx" ON "payload_llm_instructions" USING btree ("entity_slug");
  CREATE INDEX "payload_llm_instructions_updated_at_idx" ON "payload_llm_instructions" USING btree ("updated_at");
  CREATE INDEX "payload_llm_instructions_created_at_idx" ON "payload_llm_instructions" USING btree ("created_at");
  CREATE INDEX "payload_llm_instructions_rels_order_idx" ON "payload_llm_instructions_rels" USING btree ("order");
  CREATE INDEX "payload_llm_instructions_rels_parent_idx" ON "payload_llm_instructions_rels" USING btree ("parent_id");
  CREATE INDEX "payload_llm_instructions_rels_path_idx" ON "payload_llm_instructions_rels" USING btree ("path");
  CREATE INDEX "payload_llm_instructions_rels_admins_id_idx" ON "payload_llm_instructions_rels" USING btree ("admins_id");
  CREATE INDEX "payload_llm_instructions_rels_teachers_id_idx" ON "payload_llm_instructions_rels" USING btree ("teachers_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "admins_sessions" CASCADE;
  DROP TABLE "admins" CASCADE;
  DROP TABLE "admins_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_rels" CASCADE;
  DROP TABLE "_media_v" CASCADE;
  DROP TABLE "_media_v_rels" CASCADE;
  DROP TABLE "folders" CASCADE;
  DROP TABLE "folders_rels" CASCADE;
  DROP TABLE "_folders_v" CASCADE;
  DROP TABLE "_folders_v_rels" CASCADE;
  DROP TABLE "tags" CASCADE;
  DROP TABLE "tags_rels" CASCADE;
  DROP TABLE "_tags_v" CASCADE;
  DROP TABLE "_tags_v_rels" CASCADE;
  DROP TABLE "teachers_sessions" CASCADE;
  DROP TABLE "teachers" CASCADE;
  DROP TABLE "teachers_rels" CASCADE;
  DROP TABLE "_teachers_v_version_sessions" CASCADE;
  DROP TABLE "_teachers_v" CASCADE;
  DROP TABLE "_teachers_v_rels" CASCADE;
  DROP TABLE "exams_questions_options" CASCADE;
  DROP TABLE "exams_questions" CASCADE;
  DROP TABLE "exams" CASCADE;
  DROP TABLE "exams_rels" CASCADE;
  DROP TABLE "_exams_v_version_questions_options" CASCADE;
  DROP TABLE "_exams_v_version_questions" CASCADE;
  DROP TABLE "_exams_v" CASCADE;
  DROP TABLE "_exams_v_rels" CASCADE;
  DROP TABLE "exam_attempts_answers" CASCADE;
  DROP TABLE "exam_attempts" CASCADE;
  DROP TABLE "exam_attempts_rels" CASCADE;
  DROP TABLE "_exam_attempts_v_version_answers" CASCADE;
  DROP TABLE "_exam_attempts_v" CASCADE;
  DROP TABLE "_exam_attempts_v_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "payload_llm_instructions" CASCADE;
  DROP TABLE "payload_llm_instructions_rels" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_teachers_status";
  DROP TYPE "public"."enum__teachers_v_version_status";
  DROP TYPE "public"."enum_exams_status";
  DROP TYPE "public"."enum__exams_v_version_status";
  DROP TYPE "public"."enum_exam_attempts_status";
  DROP TYPE "public"."enum__exam_attempts_v_version_status";
  DROP TYPE "public"."enum_payload_llm_instructions_entity_type";`)
}
