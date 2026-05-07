import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createClient } from '@supabase/supabase-js'
import heroImg from './assets/CEO Sir.png'
import mhsLogo from './assets/MHS_Logo.png'
import './App.css'

type Role = 'Sales' | 'IT' | 'Marketing' | 'HR' | 'Others'
type QuestionType = 'text' | 'dropdown' | 'radio' | 'yesno'
type QuestionStatus = 'draft' | 'published'

type CandidateLead = {
  id: string
  createdAt: string
  name: string
  phone: string
  email: string
  role: Role
  resumeName: string
  resumeSize: number
  resumeUrl?: string
  answers: Record<string, string>
  syncStatus: 'local' | 'synced'
}

type Question = {
  id: string
  role: Role
  label: string
  type: QuestionType
  options: string[]
  order: number
  enabled: boolean
  status: QuestionStatus
}

type BasicDetails = {
  name: string
  phone: string
  email: string
}

const roles: Role[] = ['Sales', 'IT', 'Marketing', 'HR', 'Others']

const defaultQuestions: Question[] = [
  {
    id: 'sales-experience',
    role: 'Sales',
    label: 'Do you have sales experience?',
    type: 'yesno',
    options: ['Yes', 'No'],
    order: 1,
    enabled: true,
    status: 'published',
  },
  {
    id: 'sales-target',
    role: 'Sales',
    label: 'What target have you handled per month?',
    type: 'dropdown',
    options: ['Under 50 leads', '50-150 leads', '150+ leads'],
    order: 2,
    enabled: true,
    status: 'published',
  },
  {
    id: 'sales-field',
    role: 'Sales',
    label: 'Are you comfortable with field work?',
    type: 'yesno',
    options: ['Yes', 'No'],
    order: 3,
    enabled: true,
    status: 'published',
  },
  {
    id: 'it-language',
    role: 'IT',
    label: 'What is your primary programming language?',
    type: 'dropdown',
    options: ['JavaScript', 'Python', 'Java', 'PHP', 'Other'],
    order: 1,
    enabled: true,
    status: 'published',
  },
  {
    id: 'it-years',
    role: 'IT',
    label: 'How many years of experience do you have?',
    type: 'radio',
    options: ['0-1', '2-4', '5+'],
    order: 2,
    enabled: true,
    status: 'published',
  },
  {
    id: 'it-frameworks',
    role: 'IT',
    label: 'Which frameworks have you worked with?',
    type: 'text',
    options: [],
    order: 3,
    enabled: true,
    status: 'published',
  },
  {
    id: 'marketing-tools',
    role: 'Marketing',
    label: 'Which digital marketing tools have you used?',
    type: 'text',
    options: [],
    order: 1,
    enabled: true,
    status: 'published',
  },
  {
    id: 'marketing-campaigns',
    role: 'Marketing',
    label: 'Have you managed paid or organic campaigns?',
    type: 'radio',
    options: ['Paid campaigns', 'Organic campaigns', 'Both', 'Not yet'],
    order: 2,
    enabled: true,
    status: 'published',
  },
  {
    id: 'hr-specialty',
    role: 'HR',
    label: 'Which HR function are you strongest in?',
    type: 'dropdown',
    options: ['Recruitment', 'Payroll', 'Employee engagement', 'Compliance'],
    order: 1,
    enabled: true,
    status: 'published',
  },
  {
    id: 'other-interest',
    role: 'Others',
    label: 'What kind of role are you looking for?',
    type: 'text',
    options: [],
    order: 1,
    enabled: true,
    status: 'published',
  },
]

const storageKeys = {
  questions: 'mhs-career-questions',
  leads: 'mhs-career-leads',
  draft: 'mhs-career-draft',
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  'sb_publishable_GNklqg0Zp49RylG4_wygnQ__BswAgRa'

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const emptyBasic: BasicDetails = { name: '', phone: '', email: '' }

function loadState<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

function saveState<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 KB'
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function csvEscape(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })
}

function downloadLeadsCsv(leads: CandidateLead[], questions: Question[]) {
  const answerHeaders = questions
    .filter((question) => question.status === 'published')
    .sort((a, b) => a.role.localeCompare(b.role) || a.order - b.order)
  const headers = [
    'Created At',
    'Name',
    'Phone',
    'Email',
    'Role',
    'Resume',
    'Resume URL',
    'Sync Status',
    ...answerHeaders.map((question) => `${question.role}: ${question.label}`),
  ]
  const rows = leads.map((lead) => [
    lead.createdAt,
    lead.name,
    lead.phone,
    lead.email,
    lead.role,
    lead.resumeName,
    lead.resumeUrl || '',
    lead.syncStatus,
    ...answerHeaders.map((question) => lead.answers[question.id] || ''),
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `career-leads-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

async function syncLeadToSupabase(lead: CandidateLead) {
  if (!supabase) return false
  const { error } = await supabase.from('candidate_leads').insert({
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    role: lead.role,
    resume_name: lead.resumeName,
    resume_size: lead.resumeSize,
    answers: lead.answers,
  })
  return !error
}

function App() {
  const [activeView, setActiveView] = useState<'apply' | 'admin' | 'admin-login'>(
    'apply',
  )
  const [adminPage, setAdminPage] = useState<'dashboard' | 'leads' | 'questions'>(
    'dashboard',
  )
  const [adminId, setAdminId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminAuthError, setAdminAuthError] = useState('')
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() =>
    localStorage.getItem('mhs-admin-auth') === 'yes',
  )
  const [questions, setQuestions] = useState<Question[]>(() =>
    loadState(storageKeys.questions, defaultQuestions),
  )
  const [leads, setLeads] = useState<CandidateLead[]>(() =>
    loadState(storageKeys.leads, []),
  )
  const [basic, setBasic] = useState<BasicDetails>(() =>
    loadState(storageKeys.draft, { basic: emptyBasic }).basic || emptyBasic,
  )
  const [resume, setResume] = useState<File | null>(null)
  const [role, setRole] = useState<Role | ''>('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [leadSearch, setLeadSearch] = useState('')
  const [leadRoleFilter, setLeadRoleFilter] = useState<'All Roles' | Role>('All Roles')
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [newQuestion, setNewQuestion] = useState<Question>({
    id: '',
    role: 'Sales',
    label: '',
    type: 'text',
    options: [],
    order: 4,
    enabled: true,
    status: 'draft',
  })

  const activeQuestions = useMemo(
    () =>
      questions
        .filter(
          (question) =>
            question.role === role &&
            question.enabled &&
            question.status === 'published',
        )
        .sort((a, b) => a.order - b.order),
    [questions, role],
  )

  const totalSteps = 3 + activeQuestions.length + 1
  const progress = Math.round(((step + 1) / totalSteps) * 100)

  useEffect(() => saveState(storageKeys.questions, questions), [questions])
  useEffect(() => saveState(storageKeys.leads, leads), [leads])
  useEffect(() => {
    saveState(storageKeys.draft, { basic, role, answers })
  }, [basic, role, answers])
  useEffect(() => {
    if (activeView === 'admin' && !isAdminAuthenticated) {
      setActiveView('admin-login')
    }
  }, [activeView, isAdminAuthenticated])

  useEffect(() => {
    const els = document.querySelectorAll('.anim-ready')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [activeView])

  const publishedQuestions = questions.filter(
    (question) => question.status === 'published' && question.enabled,
  )
  const thisWeekLeads = leads.filter((lead) => {
    const submitted = new Date(lead.createdAt).getTime()
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return submitted >= weekAgo
  })
  const roleLeadCounts = roles.reduce<Record<Role, number>>(
    (acc, roleName) => ({
      ...acc,
      [roleName]: leads.filter((lead) => lead.role === roleName).length,
    }),
    { Sales: 0, IT: 0, Marketing: 0, HR: 0, Others: 0 },
  )
  const filteredLeads = leads.filter((lead) => {
    const searchable = `${lead.name} ${lead.email} ${lead.phone}`.toLowerCase()
    const roleMatch = leadRoleFilter === 'All Roles' || lead.role === leadRoleFilter
    return roleMatch && searchable.includes(leadSearch.toLowerCase().trim())
  })
  const questionGroups = roles.map((roleName) => ({
    role: roleName,
    list: questions
      .filter((question) => question.role === roleName)
      .sort((a, b) => a.order - b.order),
  }))

  function validateCurrentStep() {
    if (step === 0) {
      if (!basic.name.trim()) return 'Please enter your name.'
      if (!/^\d{10}$/.test(basic.phone)) return 'Phone number must be 10 digits.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(basic.email)) {
        return 'Please enter a valid email address.'
      }
    }
    if (step === 1) {
      if (!resume) return 'Please upload your resume.'
      if (!/\.(pdf|doc|docx)$/i.test(resume.name)) {
        return 'Resume must be a PDF, DOC, or DOCX file.'
      }
      if (resume.size > 5 * 1024 * 1024) return 'Resume must be under 5MB.'
    }
    if (step === 2 && !role) return 'Please select the role you want.'
    const question = activeQuestions[step - 3]
    if (question && !answers[question.id]?.trim()) {
      return 'Please answer this question to continue.'
    }
    return ''
  }

  function goNext() {
    const validation = validateCurrentStep()
    if (validation) {
      setError(validation)
      return
    }
    setError('')
    setStep((current) => Math.min(current + 1, totalSteps - 1))
  }

  function goBack() {
    setError('')
    setStep((current) => Math.max(current - 1, 0))
  }

  function startApplication(preselectedRole?: Role) {
    setActiveView('apply')
    setSuccess('')
    setError('')
    setStep(0)
    if (preselectedRole) setRole(preselectedRole)
    window.setTimeout(() => {
      document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' })
    }, 40)
  }

  function requestAdminAccess() {
    if (isAdminAuthenticated) {
      setActiveView('admin')
      return
    }
    setAdminAuthError('')
    setActiveView('admin-login')
  }

  function verifyAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validAdminId =
      (import.meta.env.VITE_ADMIN_LOGIN_ID as string | undefined) || 'admin'
    const validAdminPassword =
      (import.meta.env.VITE_ADMIN_LOGIN_PASSWORD as string | undefined) || 'admin123'
    if (
      adminId.trim().toLowerCase() === validAdminId.toLowerCase() &&
      adminPassword === validAdminPassword
    ) {
      localStorage.setItem('mhs-admin-auth', 'yes')
      setIsAdminAuthenticated(true)
      setAdminPassword('')
      setAdminAuthError('')
      setActiveView('admin')
      return
    }
    setAdminAuthError('Invalid login ID or password.')
  }

  function logoutAdmin() {
    localStorage.removeItem('mhs-admin-auth')
    setIsAdminAuthenticated(false)
    setAdminId('')
    setAdminPassword('')
    setActiveView('apply')
  }

  async function submitApplication() {
    const resumeUrl = resume ? await fileToDataUrl(resume) : ''
    const lead: CandidateLead = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      name: basic.name.trim(),
      phone: basic.phone,
      email: basic.email.trim(),
      role: role || 'Others',
      resumeName: resume?.name || '',
      resumeSize: resume?.size || 0,
      resumeUrl,
      answers,
      syncStatus: 'local',
    }
    const synced = await syncLeadToSupabase(lead)
    const savedLead = { ...lead, syncStatus: synced ? 'synced' : 'local' } as CandidateLead
    setLeads((current) => [savedLead, ...current])
    setSuccess(
      synced
        ? 'Thanks! Your application is now under review.'
        : 'Thanks! Your application is now under review.',
    )
    setBasic(emptyBasic)
    setResume(null)
    setRole('')
    setAnswers({})
    setStep(0)
    localStorage.removeItem(storageKeys.draft)
  }

  function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newQuestion.label.trim()) return
    const id = `${newQuestion.role.toLowerCase()}-${newQuestion.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${Date.now()}`
    setQuestions((current) => [
      ...current,
      {
        ...newQuestion,
        id,
        label: newQuestion.label.trim(),
        options:
          newQuestion.type === 'text'
            ? []
            : newQuestion.options.filter((option) => option.trim()),
      },
    ])
    setNewQuestion({
      id: '',
      role: 'Sales',
      label: '',
      type: 'text',
      options: [],
      order: 1,
      enabled: true,
      status: 'draft',
    })
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    )
  }

  function formatSubmissionDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  async function openResume(lead: CandidateLead) {
    if (!lead.resumeUrl) return
    const res = await fetch(lead.resumeUrl)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
  }

  function renderQuestionInput(question: Question) {
    const value = answers[question.id] || ''
    if (question.type === 'text') {
      return (
        <input
          autoFocus
          value={value}
          onChange={(event) =>
            setAnswers((current) => ({
              ...current,
              [question.id]: event.target.value,
            }))
          }
          placeholder="Type your answer"
        />
      )
    }
    return (
      <div className="choice-grid">
        {(question.type === 'yesno' ? ['Yes', 'No'] : question.options).map(
          (option) => (
            <button
              className={value === option ? 'choice selected' : 'choice'}
              key={option}
              onClick={() => {
                setAnswers((current) => ({ ...current, [question.id]: option }))
                window.setTimeout(goNext, 180)
              }}
              type="button"
            >
              {option}
            </button>
          ),
        )}
      </div>
    )
  }

  function renderStep() {
    if (success) {
      return (
        <div className="step-panel done">
          <span className="pulse-dot"></span>
          <h2>{success}</h2>
          <p>
            Your profile is now available in the leads table, and HR can export
            it to Excel anytime.
          </p>
        </div>
      )
    }
    if (step === 0) {
      return (
        <div className="step-panel basics-card">
          <div className="basics-icon">U</div>
          <h2>Let's start with your basics</h2>
          <p className="basics-subtitle">Tell us who you are this takes 30 seconds.</p>
          <div className="field-grid">
            <label>
              Full Name
              <div className="input-wrap">
                <span className="field-icon">N</span>
                <input
                  value={basic.name}
                  onChange={(event) =>
                    setBasic((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="e.g. Priya Sharma"
                />
              </div>
            </label>
            <label>
              Phone Number
              <div className="input-wrap">
                <span className="field-icon">P</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  value={basic.phone}
                  onChange={(event) =>
                    setBasic((current) => ({
                      ...current,
                      phone: event.target.value.replace(/\D/g, ''),
                    }))
                  }
                  placeholder="10-digit mobile number"
                />
              </div>
            </label>
            <label>
              Email Address
              <div className="input-wrap">
                <span className="field-icon">E</span>
                <input
                  value={basic.email}
                  onChange={(event) =>
                    setBasic((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="yourname@example.com"
                />
              </div>
            </label>
          </div>
        </div>
      )
    }
    if (step === 1) {
      return (
        <div className="step-panel">
          <span className="eyebrow">Step 2</span>
          <h2>Upload your resume</h2>
          <label className="upload-zone">
            <input
              accept=".pdf,.doc,.docx"
              onChange={(event) => setResume(event.target.files?.[0] || null)}
              type="file"
            />
            <strong>{resume ? resume.name : 'Choose PDF, DOC, or DOCX'}</strong>
            <span>{resume ? formatFileSize(resume.size) : 'Maximum file size 5MB'}</span>
          </label>
        </div>
      )
    }
    if (step === 2) {
      return (
        <div className="step-panel">
          <span className="eyebrow">Step 3</span>
          <h2>Which role fits you best?</h2>
          <div className="choice-grid role-grid">
            {roles.map((item) => (
              <button
                className={role === item ? 'choice selected' : 'choice'}
                key={item}
                onClick={() => {
                  setRole(item)
                  setError('')
                  setStep((current) => Math.min(current + 1, totalSteps - 1))
                }}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )
    }
    const question = activeQuestions[step - 3]
    if (question) {
      return (
        <div className="step-panel">
          <span className="eyebrow">
            {role} question {step - 2} of {activeQuestions.length}
          </span>
          <h2>{question.label}</h2>
          {renderQuestionInput(question)}
        </div>
      )
    }
    return (
      <div className="step-panel review">
        <span className="eyebrow">Final step</span>
        <h2>Review and submit</h2>
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{basic.name}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{role}</dd>
          </div>
          <div>
            <dt>Resume</dt>
            <dd>{resume?.name}</dd>
          </div>
        </dl>
        <button className="primary-btn" onClick={submitApplication}>
          Submit application
        </button>
      </div>
    )
  }

  return (
    <main>
      {activeView === 'apply' && (
        <nav className="topbar">
          <a className="brand" href="#home">
            <img src={mhsLogo} alt="MHS Logo" className="nav-logo" />
            MHS Careers
          </a>
          <div className="nav-actions">
            <button
              className={activeView === 'apply' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveView('apply')}
            >
              Candidate
            </button>
            <button
              className="nav-btn"
              onClick={requestAdminAccess}
            >
              Admin
            </button>
          </div>
        </nav>
      )}

      {activeView === 'apply' ? (
        <>
          <section className="hero-section" id="home">
            <div className="hero-copy">
              <div className="hero-logo-wrap">
                <img src={mhsLogo} alt="MHS Logo" className="hero-logo" />
              </div>
              <span className="eyebrow">Smart career application funnel</span>
              <h1>Join our team. Apply in a flow built around your role.</h1>
              <p>
                A quick, guided application experience with role-specific
                questions, autosaved answers, and an HR-ready lead record.
              </p>
              <button
                type="button"
                className="primary-btn"
                onClick={() => startApplication()}
              >
                Apply Now
              </button>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <img src={heroImg} alt="Career mentor" className="hero-right-image" />
            </div>
          </section>

          <section className="department-section">
            <div className="department-head anim-ready">
              <h2>Hiring Across Departments</h2>
              <p>We have opportunities for every kind of talent.</p>
            </div>
            <div className="department-grid">
              {[
                ['Sales', 'Sales', 'dept sales'],
                ['IT & Engineering', 'IT', 'dept it'],
                ['Marketing', 'Marketing', 'dept marketing'],
                ['Human Resources', 'HR', 'dept hr'],
                ['Others', 'Others', 'dept others'],
              ].map(([title, roleName, className], index) => (
                <article className={`${className} anim-ready stagger-${index + 1}`} key={title}>
                  <div className="dept-overlay">
                    <h3>{title}</h3>
                    <button
                      type="button"
                      className="dept-apply"
                      onClick={() => startApplication(roleName as Role)}
                    >
                      Apply
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="application-shell anim-ready" id="apply-form">
            <div className="form-meta">
              <span>Step {Math.min(step + 1, totalSteps)} / {totalSteps}</span>
              <strong>{progress}% complete</strong>
            </div>
            <div className="progress-track">
              <div style={{ width: `${progress}%` }}></div>
            </div>
            {renderStep()}
            {error && <p className="error">{error}</p>}
            {!success && (
              <div className="form-actions">
                <button disabled={step === 0} onClick={goBack}>
                  Back
                </button>
                {step < totalSteps - 1 && (
                  <button className="primary-btn" onClick={goNext}>
                    Continue
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="journey-cta">
            <div className="journey-inner anim-ready">
              <h2>Ready to start your journey?</h2>
              <p>It takes less than 5 minutes to apply. Our team reviews every application personally.</p>
              <button
                type="button"
                className="journey-btn"
                onClick={() => startApplication()}
              >
                Apply Now - It&apos;s Free
              </button>
            </div>
          </section>
        </>
      ) : activeView === 'admin-login' ? (
        <section className="admin-login-shell">
          <form className="admin-login-card" onSubmit={verifyAdminLogin}>
            <h1>Admin Login</h1>
            <p>Please enter valid credentials to access the admin panel.</p>
            <label>
              Login ID
              <input
                value={adminId}
                onChange={(event) => setAdminId(event.target.value)}
                placeholder="Enter admin login ID"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                placeholder="Enter password"
              />
            </label>
            {adminAuthError && <p className="error">{adminAuthError}</p>}
            <div className="login-actions">
              <button type="button" onClick={() => setActiveView('apply')}>
                Back to Candidate
              </button>
              <button className="primary-btn" type="submit">
                Login
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="admin-app-shell">
          <aside className="admin-sidebar">
            <div>
              <div className="sidebar-brand">
                <span className="sidebar-logo">TB</span>
                <div>
                  <strong>MHS Careers</strong>
                  <small>Admin Panel</small>
                </div>
              </div>
              <div className="sidebar-nav">
                <button
                  className={adminPage === 'dashboard' ? 'active' : ''}
                  onClick={() => setAdminPage('dashboard')}
                >
                  Dashboard
                </button>
                <button
                  className={adminPage === 'leads' ? 'active' : ''}
                  onClick={() => setAdminPage('leads')}
                >
                  Leads
                </button>
                <button
                  className={adminPage === 'questions' ? 'active' : ''}
                  onClick={() => setAdminPage('questions')}
                >
                  Questions
                </button>
              </div>
            </div>
            <div className="sidebar-foot">
              <button className="back-site-btn" onClick={() => setActiveView('apply')}>
                Back to Site
              </button>
              <button className="back-site-btn" onClick={logoutAdmin}>
                Logout
              </button>
            </div>
          </aside>

          <div className="admin-content">
            {adminPage === 'dashboard' && (
              <div className="admin-page fade-in">
                <header className="page-head">
                  <div>
                    <h1>Dashboard</h1>
                    <p>Overview of your recruitment funnel</p>
                  </div>
                </header>
                <section className="stats-grid">
                  <article className="stat-card">
                    <span>Total Leads</span>
                    <strong>{leads.length}</strong>
                    <small>All time submissions</small>
                  </article>
                  <article className="stat-card">
                    <span>This Week</span>
                    <strong>{thisWeekLeads.length}</strong>
                    <small>Last 7 days</small>
                  </article>
                  <article className="stat-card">
                    <span>Active Questions</span>
                    <strong>{publishedQuestions.length}</strong>
                    <small>Published questions</small>
                  </article>
                </section>
                <section className="admin-surface">
                  <div className="surface-title-row">
                    <h2>Applications by Role</h2>
                  </div>
                  {!leads.length ? (
                    <p className="empty-copy">
                      No leads yet. Share your landing page to start collecting applications.
                    </p>
                  ) : null}
                  <div className="role-bars">
                    {roles.map((roleName) => {
                      const value = roleLeadCounts[roleName]
                      const width = leads.length ? (value / leads.length) * 100 : 0
                      return (
                        <div key={roleName} className="role-row">
                          <div>
                            <span>{roleName}</span>
                            <strong>{value}</strong>
                          </div>
                          <div className="bar-track">
                            <div style={{ width: `${width}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              </div>
            )}

            {adminPage === 'leads' && (
              <div className="admin-page fade-in">
                <header className="page-head">
                  <div>
                    <h1>Leads</h1>
                    <p>{filteredLeads.length} candidates</p>
                  </div>
                  <button
                    className="ghost-action"
                    onClick={() => downloadLeadsCsv(filteredLeads, questions)}
                  >
                    Export CSV
                  </button>
                </header>
                <div className="filters-row">
                  <input
                    placeholder="Search by name, email, phone..."
                    value={leadSearch}
                    onChange={(event) => setLeadSearch(event.target.value)}
                  />
                  <select
                    value={leadRoleFilter}
                    onChange={(event) =>
                      setLeadRoleFilter(event.target.value as 'All Roles' | Role)
                    }
                  >
                    <option value="All Roles">All Roles</option>
                    {roles.map((roleName) => (
                      <option key={roleName}>{roleName}</option>
                    ))}
                  </select>
                </div>
                <section className="admin-surface">
                  {!filteredLeads.length ? (
                    <div className="center-empty-state">
                      <strong>No leads found</strong>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Resume</th>
                            <th>Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLeads.map((lead) => (
                            <tr key={lead.id}>
                              <td>{lead.name}</td>
                              <td>{lead.phone}</td>
                              <td>{lead.email}</td>
                              <td>{lead.role}</td>
                              <td>
                                {lead.resumeUrl ? (
                                  <button
                                    type="button"
                                    className="resume-link"
                                    onClick={() => openResume(lead)}
                                  >
                                    {lead.resumeName || 'View resume'}
                                  </button>
                                ) : (
                                  lead.resumeName || 'N/A'
                                )}
                              </td>
                              <td>{formatSubmissionDate(lead.createdAt)}</td>
                              <td>
                                <span
                                  className={
                                    lead.syncStatus === 'synced'
                                      ? 'pill synced'
                                      : 'pill local'
                                  }
                                >
                                  {lead.syncStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            )}

            {adminPage === 'questions' && (
              <div className="admin-page fade-in">
                <header className="page-head">
                  <div>
                    <h1>Questions</h1>
                    <p>Manage dynamic questions per job role</p>
                  </div>
                  <button
                    className="primary-btn small-btn"
                    onClick={() => setShowAddQuestion((value) => !value)}
                  >
                    {showAddQuestion ? 'Close' : 'Add Question'}
                  </button>
                </header>

                {showAddQuestion && (
                  <form className="admin-surface add-question-form" onSubmit={addQuestion}>
                    <div className="mini-grid">
                      <label>
                        Role
                        <select
                          value={newQuestion.role}
                          onChange={(event) =>
                            setNewQuestion((current) => ({
                              ...current,
                              role: event.target.value as Role,
                            }))
                          }
                        >
                          {roles.map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Type
                        <select
                          value={newQuestion.type}
                          onChange={(event) =>
                            setNewQuestion((current) => ({
                              ...current,
                              type: event.target.value as QuestionType,
                            }))
                          }
                        >
                          <option value="text">Text input</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="radio">Radio buttons</option>
                          <option value="yesno">Yes/No</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      Question
                      <input
                        value={newQuestion.label}
                        onChange={(event) =>
                          setNewQuestion((current) => ({
                            ...current,
                            label: event.target.value,
                          }))
                        }
                        placeholder="Example: What monthly target have you handled?"
                      />
                    </label>
                    {newQuestion.type !== 'text' && newQuestion.type !== 'yesno' && (
                      <label>
                        Options
                        <input
                          value={newQuestion.options.join(', ')}
                          onChange={(event) =>
                            setNewQuestion((current) => ({
                              ...current,
                              options: event.target.value
                                .split(',')
                                .map((option) => option.trim()),
                            }))
                          }
                          placeholder="Option one, Option two"
                        />
                      </label>
                    )}
                    <button className="primary-btn small-btn">Save as draft</button>
                  </form>
                )}

                <div className="question-groups">
                  {questionGroups.map((group) => (
                    <section className="admin-surface role-group" key={group.role}>
                      <div className="surface-title-row">
                        <h2>{group.role}</h2>
                        <small>{group.list.length} questions</small>
                      </div>
                      {!group.list.length ? (
                        <p className="empty-copy">No questions in this role yet.</p>
                      ) : (
                        <div className="question-stack">
                          {group.list.map((question) => (
                            <article key={question.id} className="question-item">
                              <div>
                                <strong>{question.label}</strong>
                                <div className="meta-badges">
                                  <span>{question.type}</span>
                                  <span>{question.status}</span>
                                  <span>{question.enabled ? 'enabled' : 'disabled'}</span>
                                </div>
                              </div>
                              <div className="row-actions">
                                <button
                                  onClick={() =>
                                    updateQuestion(question.id, {
                                      status:
                                        question.status === 'published'
                                          ? 'draft'
                                          : 'published',
                                    })
                                  }
                                >
                                  {question.status === 'published' ? 'Draft' : 'Publish'}
                                </button>
                                <button
                                  onClick={() =>
                                    updateQuestion(question.id, {
                                      enabled: !question.enabled,
                                    })
                                  }
                                >
                                  {question.enabled ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  onClick={() =>
                                    setQuestions((current) =>
                                      current.filter((item) => item.id !== question.id),
                                    )
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

export default App
