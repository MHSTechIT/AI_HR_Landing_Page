import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createClient } from '@supabase/supabase-js'
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
  const [activeView, setActiveView] = useState<'apply' | 'admin'>('apply')
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

  async function submitApplication() {
    const lead: CandidateLead = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      name: basic.name.trim(),
      phone: basic.phone,
      email: basic.email.trim(),
      role: role || 'Others',
      resumeName: resume?.name || '',
      resumeSize: resume?.size || 0,
      answers,
      syncStatus: 'local',
    }
    const synced = await syncLeadToSupabase(lead)
    const savedLead = { ...lead, syncStatus: synced ? 'synced' : 'local' } as CandidateLead
    setLeads((current) => [savedLead, ...current])
    setSuccess(
      synced
        ? 'Application submitted and synced.'
        : 'Application submitted locally. Add Supabase URL to sync online.',
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
          <button className="primary-btn" onClick={() => setSuccess('')}>
            Submit another application
          </button>
        </div>
      )
    }
    if (step === 0) {
      return (
        <div className="step-panel">
          <span className="eyebrow">Step 1</span>
          <h2>Tell us who you are</h2>
          <div className="field-grid">
            <label>
              Name
              <input
                value={basic.name}
                onChange={(event) =>
                  setBasic((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Your full name"
              />
            </label>
            <label>
              Phone Number
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
                placeholder="10 digit number"
              />
            </label>
            <label>
              Email ID
              <input
                value={basic.email}
                onChange={(event) =>
                  setBasic((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="name@example.com"
              />
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
                  window.setTimeout(goNext, 180)
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
      <nav className="topbar">
        <a className="brand" href="#home">
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
            className={activeView === 'admin' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('admin')}
          >
            Admin
          </button>
        </div>
      </nav>

      {activeView === 'apply' ? (
        <>
          <section className="hero-section" id="home">
            <div className="hero-copy">
              <span className="eyebrow">Smart career application funnel</span>
              <h1>Join our team. Apply in a flow built around your role.</h1>
              <p>
                A quick, guided application experience with role-specific
                questions, autosaved answers, and an HR-ready lead record.
              </p>
              <a className="primary-btn" href="#apply">
                Apply Now
              </a>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="orbit one"></div>
              <div className="orbit two"></div>
              <div className="candidate-card">
                <span>Lead quality</span>
                <strong>94%</strong>
              </div>
              <div className="floating-note">Auto-save enabled</div>
              <div className="floating-note second">Excel export ready</div>
            </div>
          </section>

          <section className="application-shell" id="apply">
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

          <section className="insights">
            {[
              ['Dynamic role flow', 'Questions change after job selection.'],
              ['Admin managed', 'HR can publish, draft, disable, and order questions.'],
              ['Lead operations', 'Local records, Supabase sync, and Excel export.'],
            ].map(([title, body]) => (
              <article key={title}>
                <span></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </section>
        </>
      ) : (
        <section className="admin-shell">
          <div className="admin-header">
            <div>
              <span className="eyebrow">HR control center</span>
              <h1>Manage questions and candidate leads</h1>
            </div>
            <button onClick={() => downloadLeadsCsv(leads, questions)}>
              Export Excel CSV
            </button>
          </div>

          <div className="admin-grid">
            <form className="admin-panel" onSubmit={addQuestion}>
              <h2>Add question</h2>
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
                Question
                <input
                  value={newQuestion.label}
                  onChange={(event) =>
                    setNewQuestion((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  placeholder="Example: Years of experience?"
                />
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
              <button className="primary-btn">Save as draft</button>
            </form>

            <div className="admin-panel">
              <h2>Question library</h2>
              <div className="question-list">
                {questions
                  .sort((a, b) => a.role.localeCompare(b.role) || a.order - b.order)
                  .map((question) => (
                    <article key={question.id} className="question-row">
                      <div>
                        <span>{question.role}</span>
                        <strong>{question.label}</strong>
                        <small>
                          {question.type} | order {question.order}
                        </small>
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
            </div>
          </div>

          <div className="admin-panel leads-panel">
            <h2>Captured leads</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Resume</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td>{lead.name}</td>
                      <td>{lead.phone}</td>
                      <td>{lead.email}</td>
                      <td>{lead.role}</td>
                      <td>{lead.resumeName}</td>
                      <td>{lead.syncStatus}</td>
                    </tr>
                  ))}
                  {!leads.length && (
                    <tr>
                      <td colSpan={6}>No leads captured yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
