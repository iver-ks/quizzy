-- =====================================================
-- Quizzy database schema
-- База данных для веб-приложения Quizzy
-- Содержит таблицы пользователей, квизов, вопросов,
-- комнат, участников, ответов и итоговых результатов.
-- =====================================================

-- Важно:
-- CREATE DATABASE здесь не используется.
-- Перед запуском этого файла нужно отдельно создать БД quizzy.

-- =====================================================
-- categories - категории квизов
-- =====================================================

CREATE TABLE public.categories (
	category_id bigserial NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT categories_name_key UNIQUE (name),
	CONSTRAINT categories_pkey PRIMARY KEY (category_id),
	CONSTRAINT chk_categories_name_not_empty CHECK ((TRIM(BOTH FROM name) <> ''::text))
);

-- =====================================================
-- users - пользователи приложения
-- =====================================================

CREATE TABLE public.users (
	user_id bigserial NOT NULL,
	"name" varchar(100) NOT NULL,
	email varchar(255) NOT NULL,
	password_hash varchar(255) NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT chk_users_name_not_empty CHECK ((TRIM(BOTH FROM name) <> ''::text)),
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (user_id)
);

-- =====================================================
-- quizzes - квизы
-- =====================================================

CREATE TABLE public.quizzes (
	quiz_id bigserial NOT NULL,
	creator_id int8 NOT NULL,
	category_id int8 NOT NULL,
	title varchar(150) NOT NULL,
	description text NULL,
	access_type varchar(20) DEFAULT 'public'::character varying NOT NULL,
	status varchar(20) DEFAULT 'draft'::character varying NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT chk_quizzes_access_type CHECK (((access_type)::text = ANY ((ARRAY['public'::character varying, 'private'::character varying])::text[]))),
	CONSTRAINT chk_quizzes_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'waiting'::character varying, 'active'::character varying, 'finished'::character varying])::text[]))),
	CONSTRAINT chk_quizzes_title_not_empty CHECK ((TRIM(BOTH FROM title) <> ''::text)),
	CONSTRAINT quizzes_pkey PRIMARY KEY (quiz_id),
	CONSTRAINT fk_quizzes_category FOREIGN KEY (category_id) REFERENCES public.categories(category_id),
	CONSTRAINT fk_quizzes_creator FOREIGN KEY (creator_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- =====================================================
-- questions - вопросы конкретного квиза
-- =====================================================

CREATE TABLE public.questions (
	question_id bigserial NOT NULL,
	quiz_id int8 NOT NULL,
	question_text text NOT NULL,
	image_url varchar(500) NULL,
	answer_type varchar(20) NOT NULL,
	time_limit_seconds int4 NOT NULL,
	points numeric(8, 2) NOT NULL,
	question_order int4 NOT NULL,
	CONSTRAINT chk_questions_answer_type CHECK (((answer_type)::text = ANY ((ARRAY['single'::character varying, 'multiple'::character varying])::text[]))),
	CONSTRAINT chk_questions_order CHECK ((question_order > 0)),
	CONSTRAINT chk_questions_points CHECK ((points > (0)::numeric)),
	CONSTRAINT chk_questions_text_not_empty CHECK ((TRIM(BOTH FROM question_text) <> ''::text)),
	CONSTRAINT chk_questions_time_limit CHECK ((time_limit_seconds > 0)),
	CONSTRAINT questions_pkey PRIMARY KEY (question_id),
	CONSTRAINT uq_questions_quiz_order UNIQUE (quiz_id, question_order),
	CONSTRAINT fk_questions_quiz FOREIGN KEY (quiz_id) REFERENCES public.quizzes(quiz_id) ON DELETE CASCADE
);

-- =====================================================
-- quiz_sessions - запущенные комнаты квизов
-- =====================================================

CREATE TABLE public.quiz_sessions (
	session_id bigserial NOT NULL,
	quiz_id int8 NOT NULL,
	creator_id int8 NOT NULL,
	room_code varchar(20) NOT NULL,
	status varchar(20) DEFAULT 'waiting'::character varying NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	started_at timestamptz NULL,
	finished_at timestamptz NULL,
	CONSTRAINT chk_quiz_sessions_dates CHECK (((finished_at IS NULL) OR (started_at IS NULL) OR (finished_at >= started_at))),
	CONSTRAINT chk_quiz_sessions_status CHECK (((status)::text = ANY ((ARRAY['waiting'::character varying, 'active'::character varying, 'finished'::character varying])::text[]))),
	CONSTRAINT quiz_sessions_pkey PRIMARY KEY (session_id),
	CONSTRAINT quiz_sessions_room_code_key UNIQUE (room_code),
	CONSTRAINT fk_quiz_sessions_creator FOREIGN KEY (creator_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
	CONSTRAINT fk_quiz_sessions_quiz FOREIGN KEY (quiz_id) REFERENCES public.quizzes(quiz_id) ON DELETE CASCADE
);

-- =====================================================
-- session_participants - участники, подключившиеся к комнате
-- =====================================================

CREATE TABLE public.session_participants (
	participant_id bigserial NOT NULL,
	session_id int8 NOT NULL,
	user_id int8 NOT NULL,
	joined_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT session_participants_pkey PRIMARY KEY (participant_id),
	CONSTRAINT uq_session_participants_session_user UNIQUE (session_id, user_id),
	CONSTRAINT fk_session_participants_session FOREIGN KEY (session_id) REFERENCES public.quiz_sessions(session_id) ON DELETE CASCADE,
	CONSTRAINT fk_session_participants_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- =====================================================
-- session_questions - вопросы внутри конкретной игровой сессии
-- =====================================================

CREATE TABLE public.session_questions (
	session_question_id bigserial NOT NULL,
	session_id int8 NOT NULL,
	question_id int8 NOT NULL,
	question_order int4 NOT NULL,
	started_at timestamptz NULL,
	ended_at timestamptz NULL,
	status varchar(20) DEFAULT 'pending'::character varying NOT NULL,
	CONSTRAINT chk_session_questions_dates CHECK (((ended_at IS NULL) OR (started_at IS NULL) OR (ended_at >= started_at))),
	CONSTRAINT chk_session_questions_order CHECK ((question_order > 0)),
	CONSTRAINT chk_session_questions_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying, 'closed'::character varying])::text[]))),
	CONSTRAINT session_questions_pkey PRIMARY KEY (session_question_id),
	CONSTRAINT uq_session_questions_session_order UNIQUE (session_id, question_order),
	CONSTRAINT uq_session_questions_session_question UNIQUE (session_id, question_id),
	CONSTRAINT fk_session_questions_question FOREIGN KEY (question_id) REFERENCES public.questions(question_id) ON DELETE CASCADE,
	CONSTRAINT fk_session_questions_session FOREIGN KEY (session_id) REFERENCES public.quiz_sessions(session_id) ON DELETE CASCADE
);

-- =====================================================
-- answer_options - варианты ответов для каждого вопроса
-- =====================================================

CREATE TABLE public.answer_options (
	option_id bigserial NOT NULL,
	question_id int8 NOT NULL,
	option_text varchar(500) NOT NULL,
	is_correct bool DEFAULT false NOT NULL,
	option_order int4 NOT NULL,
	CONSTRAINT answer_options_pkey PRIMARY KEY (option_id),
	CONSTRAINT chk_answer_options_order CHECK ((option_order > 0)),
	CONSTRAINT chk_answer_options_text_not_empty CHECK ((TRIM(BOTH FROM option_text) <> ''::text)),
	CONSTRAINT uq_answer_options_question_option UNIQUE (question_id, option_id),
	CONSTRAINT uq_answer_options_question_order UNIQUE (question_id, option_order),
	CONSTRAINT fk_answer_options_question FOREIGN KEY (question_id) REFERENCES public.questions(question_id) ON DELETE CASCADE
);

-- =====================================================
-- participant_answers - ответы участников на вопросы во время квиза
-- =====================================================

CREATE TABLE public.participant_answers (
	answer_id bigserial NOT NULL,
	session_id int8 NOT NULL,
	user_id int8 NOT NULL,
	question_id int8 NOT NULL,
	answered_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	answer_status varchar(30) NOT NULL,
	points_awarded numeric(8, 2) DEFAULT 0 NOT NULL,
	correct_options_selected int4 DEFAULT 0 NOT NULL,
	wrong_options_selected int4 DEFAULT 0 NOT NULL,
	CONSTRAINT chk_participant_answers_correct_count CHECK ((correct_options_selected >= 0)),
	CONSTRAINT chk_participant_answers_points CHECK ((points_awarded >= (0)::numeric)),
	CONSTRAINT chk_participant_answers_status CHECK (((answer_status)::text = ANY ((ARRAY['correct'::character varying, 'partially_correct'::character varying, 'incorrect'::character varying])::text[]))),
	CONSTRAINT chk_participant_answers_wrong_count CHECK ((wrong_options_selected >= 0)),
	CONSTRAINT participant_answers_pkey PRIMARY KEY (answer_id),
	CONSTRAINT uq_participant_answers_answer_question UNIQUE (answer_id, question_id),
	CONSTRAINT uq_participant_answers_one_answer UNIQUE (session_id, user_id, question_id),
	CONSTRAINT fk_participant_answers_participant FOREIGN KEY (session_id,user_id) REFERENCES public.session_participants(session_id,user_id) ON DELETE CASCADE,
	CONSTRAINT fk_participant_answers_session_question FOREIGN KEY (session_id,question_id) REFERENCES public.session_questions(session_id,question_id) ON DELETE CASCADE
);

-- =====================================================
-- results - итоговые результаты участников после завершения квиза
-- =====================================================

CREATE TABLE public.results (
	result_id bigserial NOT NULL,
	session_id int8 NOT NULL,
	user_id int8 NOT NULL,
	total_points numeric(10, 2) DEFAULT 0 NOT NULL,
	correct_answers_count int4 DEFAULT 0 NOT NULL,
	place_in_leaderboard int4 NULL,
	saved_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT chk_results_correct_answers CHECK ((correct_answers_count >= 0)),
	CONSTRAINT chk_results_place CHECK (((place_in_leaderboard IS NULL) OR (place_in_leaderboard > 0))),
	CONSTRAINT chk_results_total_points CHECK ((total_points >= (0)::numeric)),
	CONSTRAINT results_pkey PRIMARY KEY (result_id),
	CONSTRAINT uq_results_session_user UNIQUE (session_id, user_id),
	CONSTRAINT fk_results_session FOREIGN KEY (session_id) REFERENCES public.quiz_sessions(session_id) ON DELETE CASCADE,
	CONSTRAINT fk_results_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- =====================================================
-- participant_answer_options - выбранные варианты внутри ответа участника
-- =====================================================

CREATE TABLE public.participant_answer_options (
	answer_id int8 NOT NULL,
	question_id int8 NOT NULL,
	option_id int8 NOT NULL,
	CONSTRAINT pk_participant_answer_options PRIMARY KEY (answer_id, option_id),
	CONSTRAINT fk_participant_answer_options_answer FOREIGN KEY (answer_id,question_id) REFERENCES public.participant_answers(answer_id,question_id) ON DELETE CASCADE,
	CONSTRAINT fk_participant_answer_options_option FOREIGN KEY (question_id,option_id) REFERENCES public.answer_options(question_id,option_id) ON DELETE CASCADE
);
