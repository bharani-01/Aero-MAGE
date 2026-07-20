import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout.tsx';
import QuizShareModal from '../../components/QuizShareModal.tsx';

// ─── Types ───────────────────────────────────────────────────────────────────

type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'multi_select'
  | 'short_answer'
  | 'fill_blank'
  | 'ordering'
  | 'match_following'
  | 'audio_mcq'
  | 'video_mcq'
  | 'image_choice';

type QuizMode = 'classic' | 'speed_rush' | 'survey';

interface MatchPair {
  left: string;
  right: string;
}

interface QuestionDraft {
  id: string;
  questionText: string;
  questionType: QuestionType;
  sectionName?: string;
  options: string[];          // MCQ / True-False / Multi-select / Image-choice option labels
  imageOptions: string[];     // image_choice: one URL per option slot
  correctAnswer: string;      // primary correct answer (serialised for complex types)
  correctAnswers: string[];   // multi_select: array of correct option texts
  matchPairs: MatchPair[];    // match_following
  orderItems: string[];       // ordering
  mediaUrl: string;           // audio_mcq / video_mcq
  graceTime: number;          // seconds after media ends before answer locks (0 = no grace)
  points: number;
  timeLimit: number;          // 0 = no timer / unlimited
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUESTION_TYPE_META: Record<QuestionType, { label: string; icon: string; color: string; desc: string }> = {
  multiple_choice: { label: 'Multiple Choice (MCQ)', icon: 'radio_button_checked', color: 'text-blue-600 bg-blue-50 border-blue-200', desc: 'Single correct answer from 4 options' },
  true_false:      { label: 'True / False',           icon: 'thumbs_up_down',        color: 'text-green-600 bg-green-50 border-green-200', desc: '2-option binary question' },
  multi_select:    { label: 'Multi-Select',            icon: 'checklist',             color: 'text-violet-600 bg-violet-50 border-violet-200', desc: 'Multiple correct answers' },
  short_answer:    { label: 'Short Answer',            icon: 'text_fields',           color: 'text-amber-600 bg-amber-50 border-amber-200', desc: 'Student types a keyword' },
  fill_blank:      { label: 'Fill in the Blank',       icon: 'edit_note',             color: 'text-orange-600 bg-orange-50 border-orange-200', desc: 'Complete the sentence with ___' },
  ordering:        { label: 'Ordering / Sequence',     icon: 'format_list_numbered',  color: 'text-teal-600 bg-teal-50 border-teal-200', desc: 'Arrange items in correct order' },
  match_following: { label: 'Match the Following',     icon: 'compare_arrows',        color: 'text-rose-600 bg-rose-50 border-rose-200', desc: 'Connect left column to right column' },
  audio_mcq:       { label: 'Audio-Based MCQ',         icon: 'volume_up',             color: 'text-cyan-600 bg-cyan-50 border-cyan-200', desc: 'Listen to audio, then pick answer' },
  video_mcq:       { label: 'Video-Based MCQ',         icon: 'play_circle',           color: 'text-pink-600 bg-pink-50 border-pink-200', desc: 'Watch a clip, then pick answer' },
  image_choice:    { label: 'Image Choice',            icon: 'image',                 color: 'text-indigo-600 bg-indigo-50 border-indigo-200', desc: 'Options shown as images' },
};

const QUIZ_MODES: Record<QuizMode, { label: string; icon: string; desc: string }> = {
  classic:     { label: 'Classic Mode',    icon: 'school',      desc: 'Sequential questions. Faculty controls pace.' },
  speed_rush:  { label: 'Speed Rush',      icon: 'bolt',        desc: 'Timer bonus — faster correct = more points!' },
  survey:      { label: 'Survey / Poll',   icon: 'poll',        desc: 'No scoring. Collect opinions & feedback.' },
};

const blankQuestion = (overrides?: Partial<QuestionDraft>): QuestionDraft => ({
  id: `q-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  questionText: '',
  questionType: 'multiple_choice',
  sectionName: '',
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  imageOptions: ['', '', '', ''],
  correctAnswer: 'Option A',
  correctAnswers: ['Option A'],
  matchPairs: [{ left: 'Item 1', right: 'Match 1' }, { left: 'Item 2', right: 'Match 2' }],
  orderItems: ['Step 1', 'Step 2', 'Step 3'],
  mediaUrl: '',
  graceTime: 15,
  points: 10,
  timeLimit: 30,
  ...overrides,
});

const presetBanners = [
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1447069387593-a5de0862481e?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=800&auto=format&fit=crop',
];

// Serialise a question's answer into the `correct_answer` string the backend/live engine reads
function serialiseCorrectAnswer(q: QuestionDraft): string {
  if (q.questionType === 'multi_select') return q.correctAnswers.join(',');
  if (q.questionType === 'ordering') return q.orderItems.join('|');
  if (q.questionType === 'match_following') return q.matchPairs.map(p => `${p.left}:${p.right}`).join(',');
  return q.correctAnswer;
}

// Serialise options_json sent to backend
function serialiseOptions(q: QuestionDraft): string[] {
  if (q.questionType === 'ordering') return q.orderItems;
  if (q.questionType === 'match_following') return q.matchPairs.map(p => `${p.left}:${p.right}`);
  if (q.questionType === 'image_choice') return q.imageOptions;
  return q.options;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FacultyQuizzes() {
  const [quizzesList, setQuizzesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Share modal state
  const [selectedShareQuiz, setSelectedShareQuiz] = useState<any | null>(null);

  // Search & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'title' | 'questions' | 'difficulty'>('newest');
  const [filterScope, setFilterScope] = useState<'all' | 'mine' | 'public' | 'private'>('all');

  // Builder visibility
  const [showBuilderForm, setShowBuilderForm] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  // Quiz Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [difficulty, setDifficulty] = useState('medium');
  const [quizMode, setQuizMode] = useState<QuizMode>('classic');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [reviewPolicy, setReviewPolicy] = useState('full_with_answers');

  // Modals inside builder
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showInteractivePreviewModal, setShowInteractivePreviewModal] = useState(false);

  // Questions
  const [questions, setQuestions] = useState<QuestionDraft[]>([blankQuestion()]);

  // Modal
  const [selectedQuizModal, setSelectedQuizModal] = useState<any | null>(null);

  // Results Modal State
  const [selectedResultsQuiz, setSelectedResultsQuiz] = useState<any | null>(null);
  const [attemptsData, setAttemptsData] = useState<any | null>(null);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  const openResultsModal = async (quiz: any) => {
    setSelectedResultsQuiz(quiz);
    setAttemptsLoading(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/attempts`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAttemptsData(json.data);
      }
    } catch (err) {
      console.error('Failed to load quiz results:', err);
    } finally {
      setAttemptsLoading(false);
    }
  };

  // Drag-reorder ref for ordering questions
  const dragIdx = useRef<number | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setCurrentUser(JSON.parse(storedUser)); } catch (e) {}
    }
    fetchQuizzes();
  }, []);

  // ── API ────────────────────────────────────────────────────────────────────

  const fetchQuizzes = async () => {
    setLoading(true);
    setSuccessMsg(''); setErrorMsg('');
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/quizzes', { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setQuizzesList(json.data);
      else setErrorMsg(json.error?.message || 'Failed to fetch quizzes.');
    } catch {
      setErrorMsg('Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(''); setErrorMsg('');

    if (!title.trim()) { setErrorMsg('Quiz title is required.'); return; }
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].questionText.trim()) {
        setErrorMsg(`Question ${i + 1} text is required.`);
        return;
      }
    }

    const token = localStorage.getItem('accessToken');
    const endpoint = editingQuizId ? `/api/quizzes/${editingQuizId}` : '/api/quizzes';
    const method = editingQuizId ? 'PUT' : 'POST';

    const payload = {
      title,
      description: `[mode:${quizMode}] ${description}`,
      coverImageUrl,
      visibility,
      difficulty,
      shuffle_questions: shuffleQuestions,
      shuffle_options: shuffleOptions,
      review_policy: reviewPolicy,
      questions: questions.map(q => ({
        questionText: q.questionText,
        questionType: q.questionType,
        section_name: q.sectionName || null,
        options: serialiseOptions(q),
        correctAnswer: serialiseCorrectAnswer(q),
        points: q.points,
        timeLimit: q.timeLimit,
        mediaUrl: q.mediaUrl || null,
      })),
    };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(editingQuizId ? `Quiz "${title}" updated!` : `Quiz "${title}" published with ${questions.length} question(s)!`);
        setShowBuilderForm(false);
        setEditingQuizId(null);
        fetchQuizzes();
      } else {
        setErrorMsg(json.error?.message || 'Failed to save quiz.');
      }
    } catch {
      setErrorMsg('Failed to communicate with quiz API.');
    }
  };

  const handleToggleVisibility = async (quizId: string, currentVis: string, ownerId: string) => {
    if (currentUser && ownerId !== currentUser.id && currentUser.role !== 'super_admin') {
      alert('Access denied: You can only change visibility of your own quizzes.'); return;
    }
    const nextVis = currentVis === 'private' ? 'public' : 'private';
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/quizzes/${quizId}/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ visibility: nextVis }),
      });
      const json = await res.json();
      if (json.success) { setSuccessMsg('Visibility updated.'); fetchQuizzes(); }
      else setErrorMsg(json.error?.message || 'Failed to toggle visibility.');
    } catch { setErrorMsg('Failed to update visibility.'); }
  };

  const handleLaunchLiveQuiz = async (quizId: string) => {
    setSuccessMsg(''); setErrorMsg('');
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/sessions/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ quizId }),
      });
      const json = await res.json();
      if (json.success) window.location.href = `/faculty/session/${json.data.id}`;
      else setErrorMsg(json.error?.message || 'Failed to launch live quiz.');
    } catch { setErrorMsg('Failed to communicate with live session API.'); }
  };

  // ── Builder — open modes ───────────────────────────────────────────────────

  const openCreateMode = () => {
    setEditingQuizId(null);
    setTitle(''); setDescription(''); setCoverImageUrl(presetBanners[0]);
    setVisibility('private'); setDifficulty('medium'); setQuizMode('classic');
    setShuffleQuestions(false);
    setShuffleOptions(false);
    setReviewPolicy('full_with_answers');
    setQuestions([blankQuestion()]);
    setShowBuilderForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEditMode = (quiz: any) => {
    setEditingQuizId(quiz.id);
    setTitle(quiz.title || '');

    // Extract mode from description prefix
    const rawDesc: string = quiz.description || '';
    const modeMatch = rawDesc.match(/^\[mode:(\w+)\]/);
    setQuizMode((modeMatch?.[1] as QuizMode) || 'classic');
    setDescription(rawDesc.replace(/^\[mode:\w+\]\s*/, ''));

    setCoverImageUrl(quiz.cover_image_url || '');
    setVisibility(quiz.visibility || 'private');
    setDifficulty(quiz.difficulty || 'medium');
    setShuffleQuestions(Boolean(quiz.shuffle_questions));
    setShuffleOptions(Boolean(quiz.shuffle_options));
    setReviewPolicy(quiz.review_policy || 'full_with_answers');

    const mapped: QuestionDraft[] = (quiz.questions || []).map((q: any, idx: number) => {
      let opts: string[] = [];
      try { opts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []); } catch {}

      const qType: QuestionType = q.question_type || 'multiple_choice';
      const draft = blankQuestion({ id: q.id || `q-${idx}`, questionType: qType });
      draft.questionText = q.question_text || '';
      draft.sectionName = q.section_name || '';
      draft.points = q.points || 10;
      draft.timeLimit = q.time_limit || 30;
      draft.mediaUrl = q.media_url || '';

      if (qType === 'multiple_choice' || qType === 'true_false' || qType === 'audio_mcq' || qType === 'video_mcq') {
        draft.options = opts.length ? opts : draft.options;
        draft.correctAnswer = q.correct_answer || draft.options[0];
      } else if (qType === 'multi_select') {
        draft.options = opts.length ? opts : draft.options;
        draft.correctAnswers = String(q.correct_answer || '').split(',').filter(Boolean);
        draft.correctAnswer = draft.correctAnswers[0] || '';
      } else if (qType === 'image_choice') {
        draft.imageOptions = opts.length ? opts : draft.imageOptions;
        draft.options = ['A', 'B', 'C', 'D'].slice(0, opts.length);
        draft.correctAnswer = q.correct_answer || '';
      } else if (qType === 'ordering') {
        draft.orderItems = opts.length ? opts : draft.orderItems;
        draft.correctAnswer = draft.orderItems.join('|');
      } else if (qType === 'match_following') {
        draft.matchPairs = opts.map((pair: string) => {
          const [left, right] = pair.split(':');
          return { left: left || '', right: right || '' };
        });
        if (!draft.matchPairs.length) draft.matchPairs = [{ left: '', right: '' }];
        draft.correctAnswer = draft.matchPairs.map(p => `${p.left}:${p.right}`).join(',');
      } else if (qType === 'short_answer' || qType === 'fill_blank') {
        draft.correctAnswer = q.correct_answer || '';
      }
      return draft;
    });

    setQuestions(mapped.length ? mapped : [blankQuestion()]);
    setShowBuilderForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Question Mutation Helpers ──────────────────────────────────────────────

  const updateQuestion = (idx: number, patch: Partial<QuestionDraft>) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const addQuestion = () => setQuestions(prev => [...prev, blankQuestion()]);

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) { alert('Quiz must have at least 1 question.'); return; }
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleTypeChange = (idx: number, type: QuestionType) => {
    const defaults: Partial<QuestionDraft> = { questionType: type };
    if (type === 'true_false') { defaults.options = ['True', 'False']; defaults.correctAnswer = 'True'; }
    else if (type === 'multiple_choice' || type === 'audio_mcq' || type === 'video_mcq') {
      defaults.options = ['Option A', 'Option B', 'Option C', 'Option D'];
      defaults.correctAnswer = 'Option A';
    } else if (type === 'multi_select') {
      defaults.options = ['Option A', 'Option B', 'Option C', 'Option D'];
      defaults.correctAnswers = ['Option A'];
    } else if (type === 'image_choice') {
      defaults.imageOptions = ['', '', '', ''];
      defaults.correctAnswer = '0';
    } else if (type === 'ordering') {
      defaults.orderItems = ['Step 1', 'Step 2', 'Step 3', 'Step 4'];
    } else if (type === 'match_following') {
      defaults.matchPairs = [{ left: 'Item 1', right: 'Match 1' }, { left: 'Item 2', right: 'Match 2' }];
    } else if (type === 'short_answer' || type === 'fill_blank') {
      defaults.correctAnswer = '';
    }
    updateQuestion(idx, defaults);
  };

  // ── Filter / Sort ──────────────────────────────────────────────────────────

  const filteredQuizzes = quizzesList.filter(quiz => {
    const matchSearch =
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quiz.description && quiz.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (quiz.creator && quiz.creator.display_name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchSearch) return false;
    if (filterScope === 'mine') return currentUser && quiz.created_by === currentUser.id;
    if (filterScope === 'public') return quiz.visibility === 'public';
    if (filterScope === 'private') return quiz.visibility === 'private' || quiz.visibility === 'organization';
    return true;
  }).sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'questions') return (b.question_count || 0) - (a.question_count || 0);
    if (sortBy === 'difficulty') {
      const o: Record<string, number> = { easy: 1, medium: 2, hard: 3, expert: 4 };
      return (o[b.difficulty] || 0) - (o[a.difficulty] || 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="faculty">
      <div className="flex flex-col gap-8">

        {/* Alerts */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-label-md font-medium shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-green-600">check_circle</span>{successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-label-md font-medium shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">error</span>{errorMsg}
          </div>
        )}

        {/* Top Bar / Hero Header */}
        {!showBuilderForm ? (
          <div className="bg-primary-container text-on-primary-container rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
            <div className="z-10 max-w-xl">
              <span className="bg-white/20 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Faculty Quiz Studio
              </span>
              <h1 className="text-headline-md sm:text-[30px] font-black text-white leading-tight mt-2">
                Interactive Quiz Builder &amp; Host
              </h1>
              <p className="text-xs text-white/90 mt-1">
                Build multi-modal quizzes with 9 question types, video/audio media validation, and live speed-rush scoring.
              </p>
            </div>

            <button
              onClick={openCreateMode}
              className="z-10 bg-white text-primary font-extrabold px-6 py-3 rounded-full text-xs hover:shadow-xl transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap shadow"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Create New Quiz
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-outline-variant pb-4 gap-4">
            <div>
              <h1 className="text-headline-lg font-bold text-on-surface mb-1">
                {editingQuizId ? 'Edit Quiz' : 'Interactive Quiz Builder'}
              </h1>
              <p className="text-body-md text-on-surface-variant">
                Configure quiz settings, options, media clips, and grace periods.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={() => setShowTemplatesModal(true)}
                className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>Templates
              </button>
              <button type="button" onClick={() => setShowCSVImportModal(true)}
                className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition">
                <span className="material-symbols-outlined text-sm">upload_file</span>Import CSV
              </button>
              <button type="button" onClick={() => setShowInteractivePreviewModal(true)}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition">
                <span className="material-symbols-outlined text-sm">visibility</span>Live Preview
              </button>
              <button onClick={() => setShowBuilderForm(false)}
                className="bg-slate-100 text-slate-800 font-bold px-4 py-2 rounded-xl border border-outline hover:bg-slate-200 transition text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">close</span>Close Builder
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* QUIZ BUILDER FORM                                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {showBuilderForm && (
          <form onSubmit={handleSaveQuiz} className="flex flex-col gap-8">

            {/* ── Card 1: Quiz Settings & Banner ── */}
            <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-outline-variant pb-4">
                <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">tune</span>
                  1. Quiz Settings, Mode &amp; Cover Banner
                </h3>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">Step 1 of 2</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div>
                  <label className="block text-label-md font-semibold text-on-surface mb-2">Quiz Title *</label>
                  <input type="text" className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md font-medium"
                    placeholder="e.g. World History — Unit 4 Assessment"
                    value={title} onChange={e => setTitle(e.target.value)} required />
                </div>

                {/* Difficulty + Visibility */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md font-semibold text-on-surface mb-2">Difficulty</label>
                    <select className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md bg-white font-medium"
                      value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-label-md font-semibold text-on-surface mb-2">Visibility</label>
                    <select className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md bg-white font-medium"
                      value={visibility} onChange={e => setVisibility(e.target.value)}>
                      <option value="private">Private (Workspace)</option>
                      <option value="public">Public (Everyone)</option>
                    </select>
                  </div>
                </div>

                {/* Shuffle settings & review policy */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-b border-slate-100 py-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="shuffle-questions" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} className="w-4 h-4 text-primary border-outline rounded focus:ring-primary" />
                    <label htmlFor="shuffle-questions" className="text-xs font-bold text-on-surface cursor-pointer select-none">🔀 Shuffle Questions</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="shuffle-options" checked={shuffleOptions} onChange={e => setShuffleOptions(e.target.checked)} className="w-4 h-4 text-primary border-outline rounded focus:ring-primary" />
                    <label htmlFor="shuffle-options" className="text-xs font-bold text-on-surface cursor-pointer select-none">🔀 Shuffle MCQ Options</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-on-surface select-none whitespace-nowrap">🔒 Review Mode:</label>
                    <select value={reviewPolicy} onChange={e => setReviewPolicy(e.target.value)} className="w-full border border-outline rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="full_with_answers">Full Answers &amp; Scores</option>
                      <option value="score_only">Score Only</option>
                      <option value="no_review">No Review</option>
                    </select>
                  </div>
                </div>

                {/* Quiz Mode Selector */}
                <div className="md:col-span-2">
                  <label className="block text-label-md font-semibold text-on-surface mb-3">Quiz Mode</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(Object.entries(QUIZ_MODES) as [QuizMode, any][]).map(([mode, meta]) => (
                      <button key={mode} type="button" onClick={() => setQuizMode(mode)}
                        className={`p-4 rounded-xl border-2 text-left transition ${quizMode === mode ? 'border-primary bg-primary/5 shadow-sm' : 'border-outline-variant bg-white hover:border-primary/40'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`material-symbols-outlined text-base ${quizMode === mode ? 'text-primary' : 'text-on-surface-variant'}`}>{meta.icon}</span>
                          <span className={`text-xs font-bold ${quizMode === mode ? 'text-primary' : 'text-on-surface'}`}>{meta.label}</span>
                          {quizMode === mode && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <p className="text-[10px] text-on-surface-variant">{meta.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banner */}
                <div className="md:col-span-2 flex flex-col gap-3">
                  <label className="block text-label-md font-semibold text-on-surface">Cover Banner Image</label>
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-grow">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">link</span>
                      <input type="text" className="w-full border border-outline rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-label-md font-medium"
                        placeholder="Paste image URL…" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} />
                    </div>
                    <div className="relative">
                      <input type="file" accept="image/*" id="banner-file-upload" className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) { const r = new FileReader(); r.onloadend = () => { if (typeof r.result === 'string') setCoverImageUrl(r.result); }; r.readAsDataURL(file); }
                        }} />
                      <label htmlFor="banner-file-upload"
                        className="bg-secondary-container text-on-secondary-container font-semibold px-4 py-2.5 rounded-xl hover:bg-secondary-container/80 transition cursor-pointer text-xs flex items-center gap-1.5 whitespace-nowrap border border-outline-variant">
                        <span className="material-symbols-outlined text-sm">cloud_upload</span>Upload File
                      </label>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Quick Preset:</span>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {presetBanners.map((url, i) => (
                        <button key={i} type="button" onClick={() => setCoverImageUrl(url)}
                          className={`w-20 h-12 rounded-lg overflow-hidden border-2 transition flex-shrink-0 ${coverImageUrl === url ? 'border-primary ring-2 ring-primary/40' : 'border-outline hover:opacity-80'}`}>
                          <img src={url} alt="Preset" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                  {coverImageUrl && (
                    <div className="w-full h-36 rounded-xl overflow-hidden relative border border-outline-variant shadow-inner bg-slate-100">
                      <img src={coverImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-3 left-4 text-white text-xs font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-green-400">check_circle</span>Active Banner
                      </span>
                      <button type="button" onClick={() => setCoverImageUrl('')}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white p-1 rounded-full transition" title="Remove">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-label-md font-semibold text-on-surface mb-2">Description / Instructions</label>
                  <textarea className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md h-20 font-medium"
                    placeholder="Provide context or instructions for students…"
                    value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              </div>
            </div>

            {/* ── Card 2: Questions ── */}
            <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-outline-variant pb-4">
                <div>
                  <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">quiz</span>
                    2. Questions Builder ({questions.length})
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">9 question types supported — MCQ, Audio, Video, Match, Ordering &amp; more.</p>
                </div>
                <button type="button" onClick={addQuestion}
                  className="bg-primary text-white font-semibold px-4 py-2 rounded-xl text-xs hover:bg-primary/90 transition shadow flex items-center gap-1.5 active:scale-95">
                  <span className="material-symbols-outlined text-sm">add</span>Add Question
                </button>
              </div>

              <div className="flex flex-col gap-8">
                {questions.map((q, qIdx) => (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    qIdx={qIdx}
                    total={questions.length}
                    onUpdate={(patch) => updateQuestion(qIdx, patch)}
                    onRemove={() => removeQuestion(qIdx)}
                    onTypeChange={(type) => handleTypeChange(qIdx, type)}
                    dragIdx={dragIdx}
                    onDragReorder={(from, to) => {
                      setQuestions(prev => {
                        const arr = [...prev];
                        const [item] = arr.splice(from, 1);
                        arr.splice(to, 0, item);
                        return arr;
                      });
                    }}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-outline-variant">
                <button type="button" onClick={addQuestion}
                  className="bg-secondary-container text-on-secondary-container font-semibold px-6 py-3 rounded-xl hover:bg-secondary-container/80 transition text-label-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">add_circle</span>Add Another Question
                </button>
                <button type="submit"
                  className="bg-primary text-white font-semibold px-10 py-3.5 rounded-xl hover:bg-primary/90 transition shadow-lg active:scale-95 text-body-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  {editingQuizId ? 'Update Quiz' : 'Publish Quiz'} ({questions.length} Questions)
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SEARCH / FILTER TOOLBAR                                             */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {!showBuilderForm && (
          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input type="text" className="w-full border border-outline rounded-xl pl-10 pr-4 py-2.5 text-label-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Search quiz title, description…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
              {(['all', 'mine', 'public', 'private'] as const).map(scope => (
                <button key={scope} onClick={() => setFilterScope(scope)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition capitalize ${filterScope === scope ? 'bg-primary text-white font-bold shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {scope === 'all' ? `All (${quizzesList.length})` : scope === 'mine' ? 'My Quizzes' : scope}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sort:</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="border border-outline rounded-xl px-3 py-2 text-xs font-semibold bg-white">
                <option value="newest">Newest First</option>
                <option value="title">Title (A–Z)</option>
                <option value="questions">Most Questions</option>
                <option value="difficulty">Highest Difficulty</option>
              </select>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* QUIZ CARDS GRID                                                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {!showBuilderForm && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              <div className="col-span-full p-12 text-center text-on-surface-variant font-medium">Querying quiz database…</div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="col-span-full bg-white border border-outline-variant rounded-2xl p-12 text-center text-on-surface-variant font-medium shadow-sm">
                No quizzes found. Click "+ Create New Quiz" to build one!
              </div>
            ) : (
              filteredQuizzes.map(quiz => {
                  const isOwner = currentUser && (quiz.created_by === currentUser.id || currentUser.role === 'super_admin');
                  const banner = quiz.cover_image_url || presetBanners[0];
                  const rawDesc: string = quiz.description || '';
                  const modeMatch = rawDesc.match(/^\[mode:(\w+)\]/);
                  const mode = (modeMatch?.[1] as QuizMode) || 'classic';
                  const modeMeta = QUIZ_MODES[mode];

                  return (
                    <div key={quiz.id} className="bg-white border border-outline-variant rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group">
                      {/* Cover */}
                      <div className="h-40 w-full overflow-hidden relative bg-slate-100">
                        <img src={banner} alt={quiz.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        <div className="absolute top-3 left-3 flex gap-1.5">
                          <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">{quiz.difficulty}</span>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${quiz.visibility === 'public' ? 'bg-green-600 text-white' : 'bg-amber-600 text-white'}`}>{quiz.visibility}</span>
                        </div>
                        <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">{modeMeta.icon}</span>{modeMeta.label}
                        </span>
                        <span className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-primary font-extrabold text-xs px-2.5 py-1 rounded-lg border border-primary/20">
                          {quiz.question_count || (quiz.questions ? quiz.questions.length : 0)} Qs
                        </span>
                      </div>

                      {/* Body */}
                      <div className="p-6 flex-grow flex flex-col justify-between">
                        <div>
                          <h3 className="text-headline-sm font-bold text-on-surface line-clamp-1 mb-1">{quiz.title}</h3>
                          <p className="text-xs text-on-surface-variant line-clamp-2 mb-4">
                            {rawDesc.replace(/^\[mode:\w+\]\s*/, '') || 'No description provided.'}
                          </p>
                        </div>
                        <div className="text-xs text-on-surface-variant border-t border-outline-variant/60 pt-3 flex justify-between items-center">
                          <span>By <strong className="text-on-surface">{quiz.creator?.display_name || 'Faculty'}</strong></span>
                          {isOwner && <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded">Owner</span>}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="bg-surface-container-low px-6 py-4 border-t border-outline-variant flex items-center justify-between gap-2">
                        <button onClick={() => setSelectedQuizModal(quiz)}
                          className="text-xs font-semibold text-on-surface-variant hover:text-primary transition">View Questions</button>
                        <div className="flex items-center gap-2">
                          {isOwner && (
                            <>
                              <button onClick={() => openEditMode(quiz)}
                                className="text-xs font-bold text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/30 transition flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">edit</span> Edit
                              </button>
                              <button onClick={() => handleToggleVisibility(quiz.id, quiz.visibility, quiz.created_by)}
                                className="text-xs font-semibold text-on-surface-variant hover:underline">
                                {quiz.visibility === 'private' ? 'Make Public' : 'Make Private'}
                              </button>
                            </>
                          )}
                          <button onClick={() => openResultsModal(quiz)}
                            className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-sky-200 transition flex items-center gap-1"
                            title="View student results & attempt analytics">
                            <span className="material-symbols-outlined text-xs">monitoring</span> Results
                          </button>
                          <button onClick={() => setSelectedShareQuiz(quiz)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 transition flex items-center gap-1"
                            title="Share quiz to classroom stream or via link">
                            <span className="material-symbols-outlined text-xs">share</span> Share
                          </button>
                          <button onClick={() => handleLaunchLiveQuiz(quiz.id)}
                            className="bg-primary text-white font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-primary/90 transition shadow active:scale-95 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">rocket_launch</span> Launch
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>

      {/* Quiz Share Modal */}
      <QuizShareModal quiz={selectedShareQuiz} onClose={() => setSelectedShareQuiz(null)} />

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* STUDENT QUIZ ATTEMPTS & MARKS RESULTS MODAL                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {selectedResultsQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative border border-outline-variant/30 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <div>
                <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
                  Quiz Completion Analytics
                </span>
                <h3 className="text-headline-sm font-extrabold text-on-surface mt-1">
                  {selectedResultsQuiz.title}
                </h3>
              </div>
              <button
                onClick={() => { setSelectedResultsQuiz(null); setAttemptsData(null); }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {attemptsLoading || !attemptsData ? (
              <div className="p-12 text-center text-on-surface-variant font-bold animate-pulse">
                Fetching quiz attempt results from database…
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">Total Attempts</span>
                    <h4 className="text-2xl font-black text-slate-800 mt-1">{attemptsData.stats.totalAttempts}</h4>
                  </div>
                  <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-center">
                    <span className="text-[10px] font-extrabold uppercase text-sky-700">Average Marks</span>
                    <h4 className="text-2xl font-black text-sky-800 mt-1">{attemptsData.stats.avgScore} pts</h4>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                    <span className="text-[10px] font-extrabold uppercase text-emerald-700">Average Percentage</span>
                    <h4 className="text-2xl font-black text-emerald-800 mt-1">{attemptsData.stats.avgPercentage}%</h4>
                  </div>
                </div>

                {attemptsData.attempts.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-slate-400">history_toggle_off</span>
                    <p className="font-bold text-on-surface">No student attempts recorded for this quiz yet.</p>
                  </div>
                ) : (
                  <div className="border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-outline-variant text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                          <th className="p-3.5">Student Name &amp; Email</th>
                          <th className="p-3.5">Score / Marks</th>
                          <th className="p-3.5">Percentage</th>
                          <th className="p-3.5">Time Taken</th>
                          <th className="p-3.5">Completed Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/60 text-xs font-medium">
                        {attemptsData.attempts.map((row: any) => (
                          <tr key={row.id} className="hover:bg-slate-50 transition">
                            <td className="p-3.5">
                              <strong className="text-on-surface block font-bold">{row.studentName}</strong>
                              <span className="text-[11px] text-slate-400">{row.studentEmail}</span>
                            </td>
                            <td className="p-3.5 font-bold text-on-surface">
                              {row.score} / {row.totalPoints}
                            </td>
                            <td className="p-3.5 font-bold">
                              <span className={row.percentage >= 70 ? 'text-green-700' : 'text-amber-700'}>
                                {row.percentage}%
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-slate-600">
                              {row.timeTakenSeconds ? `${Math.floor(row.timeTakenSeconds / 60)}m ${row.timeTakenSeconds % 60}s` : 'N/A'}
                            </td>
                            <td className="p-3.5 text-slate-500">
                              {new Date(row.completedAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* QUIZ PREVIEW MODAL                                                    */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {selectedQuizModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl relative border border-outline-variant/30 flex flex-col">
            {selectedQuizModal.cover_image_url ? (
              <div className="h-32 w-full overflow-hidden relative">
                <img src={selectedQuizModal.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-3 left-6 text-white">
                  <h3 className="text-headline-sm font-bold">{selectedQuizModal.title}</h3>
                  <p className="text-xs opacity-90">By {selectedQuizModal.creator?.display_name || 'Faculty'}</p>
                </div>
                <button onClick={() => setSelectedQuizModal(null)} className="absolute top-3 right-3 bg-black/50 text-white p-1 rounded-full">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                <div>
                  <h3 className="text-headline-sm font-bold text-on-surface">{selectedQuizModal.title}</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">By {selectedQuizModal.creator?.display_name || 'Faculty'}</p>
                </div>
                <button onClick={() => setSelectedQuizModal(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}

            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              {(!selectedQuizModal.questions || selectedQuizModal.questions.length === 0) ? (
                <div className="text-center py-8 text-on-surface-variant font-medium">No questions saved yet.</div>
              ) : (
                selectedQuizModal.questions.map((q: any, idx: number) => {
                  let opts: string[] = [];
                  try { opts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []); } catch {}
                  const meta = QUESTION_TYPE_META[q.question_type as QuestionType] || QUESTION_TYPE_META.multiple_choice;
                  return (
                    <div key={q.id || idx} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-3">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${meta.color}`}>
                          <span className="material-symbols-outlined text-xs">{meta.icon}</span>{meta.label}
                        </span>
                        <span className="text-xs font-semibold text-on-surface-variant">⏱ {q.time_limit}s | ⭐ {q.points} Pts</span>
                      </div>
                      <p className="text-body-md font-semibold text-on-surface">{q.question_text}</p>
                      {opts.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {opts.map((opt: string, oIdx: number) => (
                            <div key={oIdx} className={`p-2.5 rounded-lg text-xs font-medium border ${q.correct_answer === opt || String(q.correct_answer).split(',').includes(opt) ? 'bg-green-50 text-green-800 border-green-300 font-bold' : 'bg-white text-on-surface-variant border-outline-variant'}`}>
                              {String.fromCharCode(65 + oIdx)}. {opt} {(q.correct_answer === opt || String(q.correct_answer).split(',').includes(opt)) && <span className="material-symbols-outlined text-xs text-green-600 align-middle ml-1">check</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {(q.question_type === 'short_answer' || q.question_type === 'fill_blank') && (
                        <div className="bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-xs font-bold text-green-800 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">check_circle</span> Answer: {q.correct_answer}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-between items-center">
              <button
                onClick={() => { const q = selectedQuizModal; setSelectedQuizModal(null); openEditMode(q); }}
                disabled={currentUser && selectedQuizModal.created_by !== currentUser.id && currentUser.role !== 'super_admin'}
                className="bg-primary/10 text-primary font-bold text-xs px-4 py-2 rounded-xl hover:bg-primary/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">edit</span> Edit This Quiz
              </button>
              <button onClick={() => setSelectedQuizModal(null)}
                className="bg-primary text-white font-semibold px-6 py-2 rounded-xl text-xs hover:bg-primary/90 transition shadow">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showCSVImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-outline-variant/30 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">upload_file</span>
                Import Questions from CSV
              </h3>
              <button type="button" onClick={() => setShowCSVImportModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Paste comma-separated question lines (CSV format) or choose a CSV file. Each row format should be:
              <br />
              <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono block mt-1 break-all">
                Question Prompt,Question Type,Section Name,Points,Time Limit,Options (semicolon-separated),Correct Answer
              </code>
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] font-mono text-slate-500 whitespace-pre-wrap">
              {"What is 2+2?,multiple_choice,Arithmetic,10,30,3;4;5;6,4\nIs Earth flat?,true_false,Geography,10,20,True;False,False"}
            </div>

            <textarea
              id="csv-text-area"
              className="w-full h-32 border border-outline rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-primary bg-white text-slate-800"
              placeholder="Paste CSV rows here..."
            />

            <div className="flex justify-between items-center">
              <input
                type="file"
                accept=".csv,.txt"
                id="csv-file-input"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const text = evt.target?.result as string;
                      const ta = document.getElementById('csv-text-area') as HTMLTextAreaElement;
                      if (ta) ta.value = text;
                    };
                    reader.readAsText(file);
                  }
                }}
              />
              <label htmlFor="csv-file-input" className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer border border-outline-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">attach_file</span> Choose CSV File
              </label>
              <button
                type="button"
                onClick={() => {
                  const ta = document.getElementById('csv-text-area') as HTMLTextAreaElement;
                  if (!ta || !ta.value.trim()) return;
                  const lines = ta.value.split('\n').filter(l => l.trim().length > 0);
                  const imported: QuestionDraft[] = [];
                  lines.forEach((line) => {
                    const parts = line.split(',');
                    if (parts.length >= 2) {
                      const text = parts[0]?.trim();
                      const type = (parts[1]?.trim() as QuestionType) || 'multiple_choice';
                      const section = parts[2]?.trim() || '';
                      const pts = Number(parts[3]?.trim()) || 10;
                      const limit = Number(parts[4]?.trim()) || 30;
                      const optsRaw = parts[5]?.trim() || '';
                      const opts = optsRaw ? optsRaw.split(';') : ['Option A', 'Option B', 'Option C', 'Option D'];
                      const correct = parts[6]?.trim() || opts[0];
                      imported.push(blankQuestion({
                        questionText: text,
                        questionType: type,
                        sectionName: section,
                        points: pts,
                        timeLimit: limit,
                        options: opts,
                        correctAnswer: correct,
                        correctAnswers: [correct]
                      }));
                    }
                  });
                  if (imported.length > 0) {
                    setQuestions(prev => {
                      if (prev.length === 1 && prev[0].questionText === '') {
                        return imported;
                      }
                      return [...prev, ...imported];
                    });
                    setSuccessMsg(`Successfully imported ${imported.length} questions from CSV!`);
                  }
                  setShowCSVImportModal(false);
                }}
                className="bg-primary text-white font-bold px-4 py-2 rounded-xl text-xs shadow hover:bg-primary/95 transition flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">download</span> Import Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUIZ TEMPLATES MODAL */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-outline-variant/30 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                Select Quiz Template
              </h3>
              <button type="button" onClick={() => setShowTemplatesModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Select a structure to quickly populate questions. This will add preset questions to your current draft.
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  const warmups = [
                    blankQuestion({ questionText: 'Recall: What is the primary focus of today\'s study topic?', questionType: 'multiple_choice', sectionName: 'Warmup', timeLimit: 15 }),
                    blankQuestion({ questionText: 'True or False: We reviewed the prerequisites in the previous lesson.', questionType: 'true_false', sectionName: 'Warmup', timeLimit: 15, options: ['True', 'False'], correctAnswer: 'True' })
                  ];
                  setQuestions(warmups);
                  setTitle('5-Min Lecture Warmup');
                  setShowTemplatesModal(false);
                }}
                className="p-4 rounded-xl border border-outline hover:border-primary text-left bg-slate-50 hover:bg-slate-100/50 transition flex items-center gap-3 w-full"
              >
                <span className="material-symbols-outlined text-2xl text-purple-600">local_fire_department</span>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">5-Min Lecture Warmup</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">2 simple recall questions (MCQ + True/False) to start the class.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const standard = Array.from({ length: 5 }).map((_, idx) =>
                    blankQuestion({
                      questionText: `Assessment Question ${idx + 1}: [Enter question topic here]`,
                      questionType: 'multiple_choice',
                      sectionName: `Section ${Math.ceil((idx + 1) / 3)}`,
                      timeLimit: 30,
                      points: 10
                    })
                  );
                  setQuestions(standard);
                  setTitle('Standard Assessment Quiz');
                  setShowTemplatesModal(false);
                }}
                className="p-4 rounded-xl border border-outline hover:border-primary text-left bg-slate-50 hover:bg-slate-100/50 transition flex items-center gap-3 w-full"
              >
                <span className="material-symbols-outlined text-2xl text-blue-600">assignment_turned_in</span>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Standard Assessment</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">5 structured MCQs with multiple sections and standard points.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const coding = [
                    blankQuestion({ questionText: 'Given the code snippet below, what is the output?\n\nconsole.log(typeof NaN);', questionType: 'multiple_choice', sectionName: 'Syntax', timeLimit: 45, options: ['number', 'string', 'undefined', 'object'], correctAnswer: 'number' }),
                    blankQuestion({ questionText: 'Fill in the blank to complete the function declaration: \n\nfunction name(___) { }', questionType: 'fill_blank', sectionName: 'Syntax', timeLimit: 45, correctAnswer: 'params' })
                  ];
                  setQuestions(coding);
                  setTitle('Coding Assessment Quiz');
                  setShowTemplatesModal(false);
                }}
                className="p-4 rounded-xl border border-outline hover:border-primary text-left bg-slate-50 hover:bg-slate-100/50 transition flex items-center gap-3 w-full"
              >
                <span className="material-symbols-outlined text-2xl text-emerald-600">code</span>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Coding &amp; Syntax Quiz</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Code-oriented questions (Syntax analysis &amp; Fill-in-the-blank parameters).</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE PREVIEW MODAL */}
      {showInteractivePreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-800 text-white flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">visibility</span>
                Interactive Builder Preview
              </h3>
              <button type="button" onClick={() => setShowInteractivePreviewModal(false)} className="text-slate-400 hover:text-white font-bold">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <InteractivePreviewPlayer questions={questions} onClose={() => setShowInteractivePreviewModal(false)} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ─── QuestionCard Sub-Component ───────────────────────────────────────────────

interface QCardProps {
  q: QuestionDraft;
  qIdx: number;
  total: number;
  onUpdate: (patch: Partial<QuestionDraft>) => void;
  onRemove: () => void;
  onTypeChange: (type: QuestionType) => void;
  dragIdx: React.MutableRefObject<number | null>;
  onDragReorder: (from: number, to: number) => void;
}

function QuestionCard({ q, qIdx, total, onUpdate, onRemove, onTypeChange, dragIdx, onDragReorder }: QCardProps) {
  const meta = QUESTION_TYPE_META[q.questionType];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl shadow-sm flex flex-col gap-5 relative overflow-hidden"
      draggable
      onDragStart={() => { dragIdx.current = qIdx; }}
      onDragOver={e => e.preventDefault()}
      onDrop={() => { if (dragIdx.current !== null && dragIdx.current !== qIdx) { onDragReorder(dragIdx.current, qIdx); dragIdx.current = null; } }}>

      {/* Header */}
      <div className="flex justify-between items-center bg-surface-container-high/60 px-4 py-2.5 rounded-t-xl">
        <div className="flex items-center gap-3">
          <span className="bg-primary text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{qIdx + 1}</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${meta.color}`}>
            <span className="material-symbols-outlined text-xs">{meta.icon}</span>{meta.label}
          </span>
          <span className="text-[10px] text-on-surface-variant hidden sm:block">Drag to reorder</span>
        </div>
        <div className="flex items-center gap-2">
          {total > 1 && (
            <button type="button" onClick={onRemove}
              className="text-red-500 hover:text-red-700 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-red-50 transition flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">delete</span>Remove
            </button>
          )}
        </div>
      </div>

      <div className="px-6 pb-6 flex flex-col gap-5">
        {/* Row: Question Text + Type + Time + Points */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="col-span-2 md:col-span-2">
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Question Type</label>
            <select className="w-full border border-outline rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-xs bg-white font-medium"
              value={q.questionType} onChange={e => onTypeChange(e.target.value as QuestionType)}>
              {(Object.entries(QUESTION_TYPE_META) as [QuestionType, any][]).map(([type, m]) => (
                <option key={type} value={type}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 md:col-span-2">
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Question Prompt *</label>
            <input type="text" className="w-full border border-outline rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-label-md font-medium"
              placeholder={q.questionType === 'fill_blank' ? 'e.g. The capital of France is ___ .' : `e.g. Question ${qIdx + 1}…`}
              value={q.questionText} onChange={e => onUpdate({ questionText: e.target.value })} required />
          </div>
          <div className="col-span-2 md:col-span-2">
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Section Name (Optional)</label>
            <input type="text" className="w-full border border-outline rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-xs font-medium"
              placeholder="e.g. Section A: Math"
              value={q.sectionName || ''} onChange={e => onUpdate({ sectionName: e.target.value })} />
          </div>
          <div className="col-span-1 md:col-span-3">
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Time Limit</label>
            <select className="w-full border border-outline rounded-xl px-3 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              value={q.timeLimit} onChange={e => onUpdate({ timeLimit: Number(e.target.value) })}>
              <option value={0}>No Limit (Unlimited)</option>
              {[10, 15, 20, 30, 45, 60, 90, 120].map(t => <option key={t} value={t}>{t}s</option>)}
            </select>
            {q.timeLimit === 0 && (
              <p className="text-[10px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">info</span>
                No countdown shown.
              </p>
            )}
          </div>
          <div className="col-span-1 md:col-span-3">
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Points</label>
            <select className="w-full border border-outline rounded-xl px-3 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              value={q.points} onChange={e => onUpdate({ points: Number(e.target.value) })}>
              {[5, 10, 20, 25, 50, 100].map(p => <option key={p} value={p}>{p} pts</option>)}
            </select>
          </div>
        </div>

        {/* Media URL + Duration Validation + Grace Period — audio/video types */}
        {(q.questionType === 'audio_mcq' || q.questionType === 'video_mcq') && (
          <MediaSection q={q} onUpdate={onUpdate} />
        )}

        {/* ── Type-specific editors ── */}

        {/* MCQ / True-False / Audio-MCQ / Video-MCQ */}
        {(q.questionType === 'multiple_choice' || q.questionType === 'true_false' || q.questionType === 'audio_mcq' || q.questionType === 'video_mcq') && (
          <div className="bg-white border border-outline-variant/60 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Answer Options</label>
              {q.questionType === 'multiple_choice' && (
                <button type="button" onClick={() => onUpdate({ options: [...q.options, `Option ${q.options.length + 1}`], imageOptions: [...q.imageOptions, ''] })}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">add</span>Add Option
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border ${q.correctAnswer === opt ? 'bg-green-600 text-white border-green-600' : 'bg-surface-container text-on-surface-variant border-outline'}`}>
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <input type="text" disabled={q.questionType === 'true_false'}
                    className={`w-full border rounded-xl px-3 py-2 text-xs ${q.correctAnswer === opt ? 'border-green-500 bg-green-50/40 font-semibold' : 'border-outline focus:border-primary'}`}
                    placeholder={`Option ${oIdx + 1}`} value={opt}
                    onChange={e => {
                      const updated = [...q.options];
                      const old = updated[oIdx]; updated[oIdx] = e.target.value;
                      onUpdate({ options: updated, correctAnswer: q.correctAnswer === old ? e.target.value : q.correctAnswer });
                    }} />
                  <button type="button" onClick={() => onUpdate({ correctAnswer: opt })}
                    className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-lg border transition flex items-center gap-0.5 ${q.correctAnswer === opt ? 'bg-green-600 text-white border-green-600' : 'text-slate-500 border-outline hover:border-green-400 hover:text-green-700'}`}>
                    {q.correctAnswer === opt ? <span className="material-symbols-outlined text-xs">check</span> : 'Set'}
                  </button>
                  {q.questionType !== 'true_false' && q.options.length > 2 && (
                    <button type="button" onClick={() => { const o = q.options.filter((_, i) => i !== oIdx); onUpdate({ options: o, correctAnswer: q.correctAnswer === opt ? o[0] : q.correctAnswer }); }}
                      className="text-red-400 hover:text-red-600"><span className="material-symbols-outlined text-sm">remove_circle</span></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Select */}
        {q.questionType === 'multi_select' && (
          <div className="bg-white border border-outline-variant/60 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-on-surface uppercase">Options (check all correct answers)</label>
              <button type="button" onClick={() => onUpdate({ options: [...q.options, `Option ${q.options.length + 1}`] })}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">add</span>Add Option
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt, oIdx) => {
                const isCorrect = q.correctAnswers.includes(opt);
                return (
                  <div key={oIdx} className="flex items-center gap-2">
                    <button type="button" onClick={() => {
                      const ca = isCorrect ? q.correctAnswers.filter(x => x !== opt) : [...q.correctAnswers, opt];
                      onUpdate({ correctAnswers: ca, correctAnswer: ca.join(',') });
                    }} className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition ${isCorrect ? 'bg-green-600 text-white border-green-600' : 'bg-white border-outline hover:border-primary'}`}>
                      {isCorrect ? <span className="material-symbols-outlined text-xs">check</span> : String.fromCharCode(65 + oIdx)}
                    </button>
                    <input type="text" className={`w-full border rounded-xl px-3 py-2 text-xs ${isCorrect ? 'border-green-500 bg-green-50/40 font-semibold' : 'border-outline'}`}
                      value={opt} onChange={e => {
                        const updated = [...q.options]; const old = updated[oIdx]; updated[oIdx] = e.target.value;
                        const ca = q.correctAnswers.map(x => x === old ? e.target.value : x);
                        onUpdate({ options: updated, correctAnswers: ca, correctAnswer: ca.join(',') });
                      }} />
                    {q.options.length > 2 && (
                      <button type="button" onClick={() => { const o = q.options.filter((_, i) => i !== oIdx); const ca = q.correctAnswers.filter(x => x !== opt); onUpdate({ options: o, correctAnswers: ca, correctAnswer: ca.join(',') }); }}
                        className="text-red-400 hover:text-red-600"><span className="material-symbols-outlined text-sm">remove_circle</span></button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">info</span>
              Click letter button to toggle correct answers. Multiple can be selected.
            </p>
          </div>
        )}

        {/* Short Answer */}
        {q.questionType === 'short_answer' && (
          <div className="bg-white border border-outline-variant/60 rounded-xl p-5 flex flex-col gap-3">
            <label className="text-xs font-bold text-on-surface uppercase">Accepted Answer (keyword match)</label>
            <input type="text" className="w-full border-2 border-primary rounded-xl px-4 py-2.5 text-label-md font-medium bg-primary/5 text-primary focus:outline-none"
              placeholder="e.g. Paris (case-insensitive match)"
              value={q.correctAnswer} onChange={e => onUpdate({ correctAnswer: e.target.value })} />
            <p className="text-[10px] text-on-surface-variant">Student's typed answer will be normalised (trimmed, lowercase) before comparison.</p>
          </div>
        )}

        {/* Fill in the Blank */}
        {q.questionType === 'fill_blank' && (
          <div className="bg-white border border-outline-variant/60 rounded-xl p-5 flex flex-col gap-3">
            <div>
              <label className="text-xs font-bold text-on-surface uppercase block mb-1.5">Sentence Template</label>
              <p className="text-[10px] text-on-surface-variant mb-2">Use <code className="bg-slate-100 px-1 rounded">___</code> to mark the blank. Example: <em>"The capital of France is ___ ."</em></p>
              <input type="text" className="w-full border border-outline rounded-xl px-4 py-2.5 text-label-md font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="e.g. The speed of light is ___ km/s."
                value={q.questionText} onChange={e => onUpdate({ questionText: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-bold text-primary uppercase block mb-1.5">Correct Answer for ___</label>
              <input type="text" className="w-full border-2 border-primary rounded-xl px-4 py-2.5 text-label-md font-bold bg-primary/5 text-primary focus:outline-none"
                placeholder="e.g. 299,792"
                value={q.correctAnswer} onChange={e => onUpdate({ correctAnswer: e.target.value })} />
            </div>
          </div>
        )}

        {/* Ordering */}
        {q.questionType === 'ordering' && (
          <div className="bg-white border border-outline-variant/60 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-on-surface uppercase">Sequence Items (top = first in correct order)</label>
              <button type="button" onClick={() => onUpdate({ orderItems: [...q.orderItems, `Step ${q.orderItems.length + 1}`] })}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">add</span>Add Item
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {q.orderItems.map((item, iIdx) => (
                <div key={iIdx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{iIdx + 1}</span>
                  <input type="text" className="w-full border border-outline rounded-xl px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    value={item} onChange={e => { const o = [...q.orderItems]; o[iIdx] = e.target.value; onUpdate({ orderItems: o, correctAnswer: o.join('|') }); }} />
                  <div className="flex flex-col gap-0.5">
                    <button type="button" disabled={iIdx === 0} onClick={() => {
                      const o = [...q.orderItems]; [o[iIdx - 1], o[iIdx]] = [o[iIdx], o[iIdx - 1]]; onUpdate({ orderItems: o, correctAnswer: o.join('|') });
                    }} className="text-slate-400 hover:text-primary disabled:opacity-30"><span className="material-symbols-outlined text-sm">arrow_upward</span></button>
                    <button type="button" disabled={iIdx === q.orderItems.length - 1} onClick={() => {
                      const o = [...q.orderItems]; [o[iIdx], o[iIdx + 1]] = [o[iIdx + 1], o[iIdx]]; onUpdate({ orderItems: o, correctAnswer: o.join('|') });
                    }} className="text-slate-400 hover:text-primary disabled:opacity-30"><span className="material-symbols-outlined text-sm">arrow_downward</span></button>
                  </div>
                  {q.orderItems.length > 2 && (
                    <button type="button" onClick={() => { const o = q.orderItems.filter((_, i) => i !== iIdx); onUpdate({ orderItems: o, correctAnswer: o.join('|') }); }}
                      className="text-red-400 hover:text-red-600"><span className="material-symbols-outlined text-sm">remove_circle</span></button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-on-surface-variant">Students must drag or click to arrange items in this exact order.</p>
          </div>
        )}

        {/* Match the Following */}
        {q.questionType === 'match_following' && (
          <div className="bg-white border border-outline-variant/60 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-on-surface uppercase">Match Pairs (Left → Right)</label>
              <button type="button" onClick={() => { const p = [...q.matchPairs, { left: '', right: '' }]; onUpdate({ matchPairs: p, correctAnswer: p.map(x => `${x.left}:${x.right}`).join(',') }); }}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">add</span>Add Pair
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {q.matchPairs.map((pair, pIdx) => (
                <div key={pIdx} className="flex items-center gap-2">
                  <input type="text" className="w-full border border-outline rounded-xl px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    placeholder="Left item (e.g. Paris)" value={pair.left}
                    onChange={e => { const p = [...q.matchPairs]; p[pIdx] = { ...pair, left: e.target.value }; onUpdate({ matchPairs: p, correctAnswer: p.map(x => `${x.left}:${x.right}`).join(',') }); }} />
                  <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0">arrow_forward</span>
                  <input type="text" className="w-full border border-green-400 rounded-xl px-3 py-2 text-xs focus:border-green-600 focus:outline-none bg-green-50"
                    placeholder="Right match (e.g. France Capital)" value={pair.right}
                    onChange={e => { const p = [...q.matchPairs]; p[pIdx] = { ...pair, right: e.target.value }; onUpdate({ matchPairs: p, correctAnswer: p.map(x => `${x.left}:${x.right}`).join(',') }); }} />
                  {q.matchPairs.length > 2 && (
                    <button type="button" onClick={() => { const p = q.matchPairs.filter((_, i) => i !== pIdx); onUpdate({ matchPairs: p, correctAnswer: p.map(x => `${x.left}:${x.right}`).join(',') }); }}
                      className="text-red-400 hover:text-red-600 flex-shrink-0"><span className="material-symbols-outlined text-sm">remove_circle</span></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Choice */}
        {q.questionType === 'image_choice' && (
          <div className="bg-white border border-outline-variant/60 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-on-surface uppercase">Image Options (paste image URL per option)</label>
              <button type="button" onClick={() => onUpdate({ imageOptions: [...q.imageOptions, ''] })}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">add</span>Add Image
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {q.imageOptions.map((imgUrl, iIdx) => (
                <div key={iIdx} className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition ${q.correctAnswer === String(iIdx) ? 'border-green-500 bg-green-50' : 'border-outline-variant'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center border ${q.correctAnswer === String(iIdx) ? 'bg-green-600 text-white border-green-600' : 'bg-white border-outline text-slate-500'}`}>
                      {String.fromCharCode(65 + iIdx)}
                    </span>
                    <input type="url" className="w-full border border-outline rounded-lg px-2 py-1.5 text-[11px] focus:outline-none"
                      placeholder="https://image-url.jpg" value={imgUrl}
                      onChange={e => { const o = [...q.imageOptions]; o[iIdx] = e.target.value; onUpdate({ imageOptions: o }); }} />
                    <button type="button" onClick={() => onUpdate({ correctAnswer: String(iIdx) })}
                      className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border transition flex items-center gap-0.5 ${q.correctAnswer === String(iIdx) ? 'bg-green-600 text-white border-green-600' : 'border-outline hover:border-green-400 hover:text-green-700'}`}>
                      {q.correctAnswer === String(iIdx) ? <span className="material-symbols-outlined text-xs">check</span> : 'Set'}
                    </button>
                  </div>
                  {imgUrl ? (
                    <img src={imgUrl} alt={`Option ${iIdx + 1}`} className="w-full h-24 object-cover rounded-lg border border-outline-variant" />
                  ) : (
                    <div className="w-full h-24 bg-slate-100 rounded-lg border border-outline-variant/60 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined">image</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MediaSection Sub-Component ──────────────────────────────────────────────
// Handles audio/video URL input with:
//   • Duration detection via HTMLMediaElement loadedmetadata
//   • Warning when media is longer than the question's time limit
//   • Auto-suggest button to set time limit = media duration + graceTime
//   • Grace period selector (extra answer seconds after media ends)

interface MediaSectionProps {
  q: QuestionDraft;
  onUpdate: (patch: Partial<QuestionDraft>) => void;
}

function MediaSection({ q, onUpdate }: MediaSectionProps) {
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);
  const [durationError, setDurationError] = useState('');
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  const isVideo = q.questionType === 'video_mcq';
  const isAudio = q.questionType === 'audio_mcq';

  // Validate: detected media duration vs time limit
  const mediaTooLong =
    detectedDuration !== null &&
    q.timeLimit > 0 &&
    detectedDuration > q.timeLimit;

  // Total effective time: timeLimit must cover at least media + graceTime
  const suggestedLimit =
    detectedDuration !== null
      ? Math.ceil(detectedDuration) + q.graceTime
      : null;

  const handleMetadata = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
    const el = e.currentTarget;
    const dur = el.duration;
    if (!isFinite(dur)) {
      setDetectedDuration(null);
      setDurationError('');
      return;
    }
    setDetectedDuration(Math.ceil(dur));
    setDurationError('');
  };

  const handleMediaError = () => {
    setDetectedDuration(null);
    setDurationError('Could not load media. Check the URL is a direct file link (not a webpage).');
  };

  return (
    <div className="flex flex-col gap-3">
      {/* URL input */}
      <div>
        <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">{isAudio ? 'volume_up' : 'movie'}</span>
          {isAudio ? 'Audio URL (.mp3 / .wav / .ogg)' : 'Video URL (.mp4 / .webm)'}
        </label>
        <input
          type="url"
          className="w-full border border-outline rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-label-md"
          placeholder={isAudio ? 'https://example.com/clip.mp3' : 'https://example.com/clip.mp4'}
          value={q.mediaUrl}
          onChange={e => {
            setDetectedDuration(null);
            setDurationError('');
            onUpdate({ mediaUrl: e.target.value });
          }}
        />
      </div>

      {/* Media player preview with metadata detection */}
      {q.mediaUrl && (
        <div className="flex flex-col gap-2">
          {isAudio && (
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              controls
              src={q.mediaUrl}
              className="w-full rounded-lg"
              onLoadedMetadata={handleMetadata}
              onError={handleMediaError}
            />
          )}
          {isVideo && (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              controls
              src={q.mediaUrl}
              className="w-full rounded-xl max-h-48 object-contain bg-black"
              onLoadedMetadata={handleMetadata}
              onError={handleMediaError}
            />
          )}

          {/* Load error */}
          {durationError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-medium">
              <span className="material-symbols-outlined text-sm flex-shrink-0">error</span>
              <span>{durationError}</span>
            </div>
          )}

          {/* Duration info */}
          {detectedDuration !== null && (
            <div className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border text-xs font-semibold ${mediaTooLong ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">{mediaTooLong ? 'warning' : 'check_circle'}</span>
                {isVideo ? 'Video' : 'Audio'} duration: <strong>{detectedDuration}s</strong>
              </span>

              {mediaTooLong ? (
                <>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">warning</span>
                    Media is <strong>{detectedDuration - q.timeLimit}s longer</strong> than the time limit ({q.timeLimit === 0 ? 'No Limit' : `${q.timeLimit}s`}).
                    Students won't finish watching before time runs out!
                  </span>
                  {suggestedLimit !== null && (
                    <button
                      type="button"
                      onClick={() => onUpdate({ timeLimit: suggestedLimit })}
                      className="ml-auto bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] hover:bg-red-700 transition flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                      Auto-fix: set to {suggestedLimit}s
                    </button>
                  )}
                </>
              ) : (
                <span className="text-green-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  Media fits within the {q.timeLimit === 0 ? 'unlimited' : `${q.timeLimit}s`} time limit.
                  {q.graceTime > 0 && ` (+${q.graceTime}s grace after playback)`}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grace Period + No-Timer settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">timer</span>
            Grace Period After Media Ends
          </label>
          <select
            className="w-full border border-outline rounded-xl px-3 py-2 text-xs bg-white"
            value={q.graceTime}
            onChange={e => {
              const gt = Number(e.target.value);
              onUpdate({ graceTime: gt });
            }}
          >
            <option value={0}>No Grace (lock immediately)</option>
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
            <option value={15}>15 seconds (default)</option>
            <option value={20}>20 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>60 seconds</option>
          </select>
          <p className="text-[10px] text-on-surface-variant mt-1">
            Students get this many extra seconds to answer <em>after</em> the media finishes playing.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">schedule</span>
            Effective Answer Window
          </label>
          <div className={`p-3 rounded-xl border text-xs font-bold text-center ${q.timeLimit === 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-primary/5 border-primary/20 text-primary'}`}>
            {q.timeLimit === 0 ? (
              <span className="flex flex-col items-center gap-1">
                <span className="material-symbols-outlined">all_inclusive</span>
                No Timer — Unlimited
              </span>
            ) : (
              <span className="flex flex-col items-center">
                <span className="text-xl font-black">{q.timeLimit + q.graceTime}s total</span>
                <span className="font-normal text-on-surface-variant">
                  {q.timeLimit}s limit {q.graceTime > 0 ? `+ ${q.graceTime}s grace` : '(no grace)'}
                </span>
                {detectedDuration !== null && q.timeLimit + q.graceTime < detectedDuration && (
                  <span className="text-red-600 font-bold mt-1 text-[10px] flex items-center justify-center gap-0.5">
                    <span className="material-symbols-outlined text-xs">warning</span>
                    Still shorter than media ({detectedDuration}s)!
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* No-timer info box */}
      {q.timeLimit === 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs">
          <span className="material-symbols-outlined text-sm flex-shrink-0">info</span>
          <div>
            <strong>No Timer mode:</strong> The media will play fully and students can answer at any pace.
            Grace period still applies after media ends. Faculty must manually press <em>Next Question</em>.
          </div>
        </div>
      )}
    </div>
  );
}

function InteractivePreviewPlayer({ questions, onClose }: { questions: QuestionDraft[], onClose: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);

  const activeQuestion = questions[currentIdx];

  // Set up timer
  useEffect(() => {
    if (!activeQuestion) return;
    setTimeLeft(activeQuestion.timeLimit || 30);
    setSelectedOption(null);
    setIsAnswered(false);
  }, [currentIdx, activeQuestion]);

  useEffect(() => {
    if (timeLeft <= 0 || isAnswered) return;
    const timer = setTimeout(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsAnswered(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isAnswered]);

  if (!activeQuestion) {
    return <div className="text-center text-xs p-6 text-slate-400">No questions to preview. Add questions in the builder first!</div>;
  }

  const handleSelect = (opt: string) => {
    if (isAnswered) return;
    setSelectedOption(opt);
  };

  const handleSubmit = () => {
    setIsAnswered(true);
    const correct = activeQuestion.correctAnswer;
    if (selectedOption === correct) {
      setScore(prev => prev + activeQuestion.points);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      // Completed preview
      setIsAnswered(true);
      setCurrentIdx(questions.length); // triggers final score screen
    }
  };

  if (currentIdx >= questions.length) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-6 gap-4">
        <span className="material-symbols-outlined text-5xl text-green-400">emoji_events</span>
        <h4 className="text-base font-black text-white">Preview Completed!</h4>
        <p className="text-xs text-slate-400 font-medium">Your mock score is <strong className="text-white font-bold">{score}</strong> points.</p>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => {
              setCurrentIdx(0);
              setScore(0);
            }}
            className="bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-slate-700 transition"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-primary/95 transition shadow"
          >
            Close Preview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      {/* Progress & Timer */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        <span>Question {currentIdx + 1} of {questions.length}</span>
        {activeQuestion.sectionName && <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{activeQuestion.sectionName}</span>}
        <span className="text-amber-500 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">timer</span>
          {timeLeft}s
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div className="bg-primary h-full transition-all" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Prompt */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 mt-2">
        <p className="text-sm font-bold text-white leading-relaxed">{activeQuestion.questionText}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {activeQuestion.options.map((opt, idx) => {
          const isSelected = selectedOption === opt;
          const isCorrect = opt === activeQuestion.correctAnswer;
          let btnClass = "border-slate-850 bg-slate-800 hover:bg-slate-750 text-slate-300";
          if (isSelected) {
            btnClass = "border-primary bg-primary/20 text-white font-bold";
          }
          if (isAnswered) {
            if (isCorrect) {
              btnClass = "border-green-500 bg-green-500/20 text-green-300 font-bold";
            } else if (isSelected) {
              btnClass = "border-red-500 bg-red-500/20 text-red-300";
            }
          }
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(opt)}
              disabled={isAnswered}
              className={`p-3 rounded-xl border text-xs text-left transition flex items-center gap-2 ${btnClass}`}
            >
              <span className="w-6 h-6 rounded-lg bg-slate-750 text-[10px] font-bold flex items-center justify-center flex-shrink-0 text-slate-400">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="line-clamp-1">{opt}</span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-800/80 pt-3.5 mt-2">
        {!isAnswered ? (
          <button
            type="button"
            disabled={!selectedOption}
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/95 text-white font-bold px-6 py-2.5 rounded-xl text-xs disabled:opacity-50 transition active:scale-95 shadow"
          >
            Submit Answer
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="bg-slate-800 hover:bg-slate-750 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition flex items-center gap-1"
          >
            {currentIdx < questions.length - 1 ? 'Next Question' : 'Finish Preview'}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );
}
