import express from 'express'
import cors from 'cors'
import multer from 'multer'

const app = express()

app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

// Setup multer for in-memory file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})

// -------------------------------------------------------------
// In-Memory Seed Data & State
// -------------------------------------------------------------

const roles = [
  { id: 'r1', name: 'applicant', description: 'Applicant - ST students' },
  { id: 'r2', name: 'institute_verifier', description: 'Institute Verifier' },
  { id: 'r3', name: 'district_officer', description: 'District/State Nodal Officer' },
  { id: 'r4', name: 'scheme_officer', description: 'Scheme Officer' },
  { id: 'r5', name: 'selection_committee', description: 'Selection Committee' },
  { id: 'r6', name: 'finance_officer', description: 'Finance/DBT Officer' },
  { id: 'r7', name: 'super_admin', description: 'Super Admin' },
  { id: 'r8', name: 'auditor', description: 'Auditor' }
]

const institutes = [
  { id: 'inst-1', name: 'Ranchi University', code: 'RU001', state: 'Jharkhand', district: 'Ranchi', type: 'university' },
  { id: 'inst-2', name: 'IIT Dhanbad', code: 'IITD001', state: 'Jharkhand', district: 'Dhanbad', type: 'university' },
  { id: 'inst-3', name: 'Central University of Jharkhand', code: 'CUJ001', state: 'Jharkhand', district: 'Ranchi', type: 'university' }
]

const demoUsers = [
  { id: 'u-applicant', email: 'applicant@demo.local', full_name: 'Ayush M.', roles: ['applicant'], phone: '9876543210' },
  { id: 'u-officer', email: 'officer@demo.local', full_name: 'Rajesh Kumar', roles: ['district_officer', 'scheme_officer'], phone: '9876543211' },
  { id: 'u-admin', email: 'admin@demo.local', full_name: 'Priya Singh', roles: ['super_admin', 'scheme_officer'], phone: '9876543212' },
  { id: 'u-committee', email: 'committee@demo.local', full_name: 'Dr. A. Murmu', roles: ['selection_committee'], phone: '9876543213' },
  { id: 'u-institute', email: 'institute@demo.local', full_name: 'Prof. S. Toppo', roles: ['institute_verifier'], phone: '9876543214' },
  { id: 'u-finance', email: 'finance@demo.local', full_name: 'Anita Desai', roles: ['finance_officer'], phone: '9876543215' },
  { id: 'u-auditor', email: 'auditor@demo.local', full_name: 'Vikram Patel', roles: ['auditor'], phone: '9876543216' }
]

let users = [...demoUsers]

let applicantProfile = {
  id: 'app-prof-1',
  user_id: 'u-applicant',
  full_name: 'Ayush M.',
  dob: '2003-05-18',
  gender: 'Male',
  category: 'ST',
  state: 'Jharkhand',
  district: 'East Singhbhum',
  mobile: '9876543210',
  email: 'ayusheditor1503@gmail.com',
  address: 'NIT Jamshedpur Campus, Adityapur, Jamshedpur, Jharkhand - 831014',
  institute_id: 'inst-2',
  course: 'B.Tech Electrical & Electronics Engineering',
  admission_year: 2022,
  annual_family_income: 210000,
  parent_name: 'M. M. Murmu',
  bank_account_placeholder: 'SBI - A/C Ending in 8841 (Aadhaar Seeded)'
}

let schemes = [
  {
    id: 'mota-edu-881',
    code: 'MoTA-EDU-2026-881',
    name: 'National Fellowship and Scholarship for Higher Education of ST Students',
    description: 'Provides direct monthly fellowship and actual institutional fees for ST students enrolled in M.Phil, Ph.D. and premier accredited higher education programs.',
    department: 'Ministry of Tribal Affairs (Govt. of India)',
    education_level: 'PhD',
    target_category: 'ST',
    income_limit: 500000,
    age_min: 18,
    age_max: 35,
    seats: 750,
    start_date: new Date(Date.now() - 30 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 60 * 86400000).toISOString(),
    status: 'active',
    is_published: true,
    current_version: 1,
    fields: [
      { id: 'f1', field_key: 'full_name', label: 'Full Name (as per records)', field_type: 'text', placeholder: 'Enter full name', required: true, order_index: 0, help_text: 'Name as per ST certificate' },
      { id: 'f2', field_key: 'dob', label: 'Date of Birth', field_type: 'date', required: true, order_index: 1 },
      { id: 'f3', field_key: 'gender', label: 'Gender', field_type: 'dropdown', options: ['Female', 'Male', 'Other', 'Prefer not to say'], required: true, order_index: 2 },
      { id: 'f4', field_key: 'category', label: 'Category', field_type: 'radio', options: ['ST', 'SC', 'OBC', 'General'], required: true, order_index: 3 },
      { id: 'f5', field_key: 'state', label: 'State', field_type: 'dropdown', options: ['Jharkhand', 'Odisha', 'Chhattisgarh', 'West Bengal', 'Madhya Pradesh'], required: true, order_index: 4 },
      { id: 'f6', field_key: 'district', label: 'District', field_type: 'text', placeholder: 'Enter district', required: true, order_index: 5 },
      { id: 'f7', field_key: 'mobile', label: 'Mobile Number', field_type: 'phone', required: true, order_index: 6 },
      { id: 'f8', field_key: 'email', label: 'Email', field_type: 'email', required: true, order_index: 7 },
      { id: 'f9', field_key: 'course', label: 'Course / Program', field_type: 'dropdown', options: ['PhD', 'MPhil', 'Masters', 'Bachelors'], required: true, order_index: 8 },
      { id: 'f10', field_key: 'research_area', label: 'Research Area', field_type: 'text', placeholder: 'e.g., Tribal Anthropology, Linguistics', required: true, order_index: 9, help_text: 'Added via configurator - applicant sees automatically' },
      { id: 'f11', field_key: 'institute_name', label: 'Institute / University', field_type: 'text', placeholder: 'Enter institute name', required: true, order_index: 10 },
      { id: 'f12', field_key: 'admission_year', label: 'Admission Year', field_type: 'number', required: true, order_index: 11 },
      { id: 'f13', field_key: 'annual_family_income', label: 'Annual Family Income (₹)', field_type: 'number', required: true, order_index: 12, help_text: 'As per income certificate' },
      { id: 'f14', field_key: 'parent_name', label: 'Parent / Guardian Name', field_type: 'text', required: false, order_index: 13 },
      { id: 'f15', field_key: 'research_proposal_title', label: 'Research Proposal Title', field_type: 'textarea', placeholder: 'Enter proposal title', required: true, order_index: 14 },
      { id: 'f16', field_key: 'research_proposal_summary', label: 'Research Proposal Summary', field_type: 'textarea', placeholder: 'Brief summary (500 words)', required: false, order_index: 15 },
      { id: 'f17', field_key: 'marks_percentage', label: 'Previous Qualifying Marks (%)', field_type: 'number', required: true, order_index: 16 }
    ],
    documents: [
      { id: 'd1', document_key: 'st_certificate', document_name: 'ST Certificate', required: true, allowed_file_types: ['image/jpeg', 'image/png', 'application/pdf'], max_size_mb: 5, validity_required: false, help_text: 'Caste certificate issued by competent revenue authority', order_index: 0 },
      { id: 'd2', document_key: 'income_certificate', document_name: 'Income Certificate', required: true, allowed_file_types: ['image/jpeg', 'image/png', 'application/pdf'], max_size_mb: 5, validity_required: true, help_text: 'Current financial year income certificate', order_index: 1 },
      { id: 'd3', document_key: 'marksheet', document_name: 'Post-Graduation Marksheet', required: true, allowed_file_types: ['image/jpeg', 'image/png', 'application/pdf'], max_size_mb: 5, validity_required: false, help_text: 'Final PG semester mark statement', order_index: 2 },
      { id: 'd4', document_key: 'admission_proof', document_name: 'PhD Admission Letter / ID', required: true, allowed_file_types: ['image/jpeg', 'image/png', 'application/pdf'], max_size_mb: 5, validity_required: false, help_text: 'Proof of current enrollment in PhD program', order_index: 3 }
    ],
    rules: [
      { id: 'r1', field_key: 'category', operator: 'eq', value: 'ST', action: 'PASS', message: 'Category must be ST' },
      { id: 'r2', field_key: 'annual_family_income', operator: 'lte', value: '500000', action: 'PASS', message: 'Annual family income must be ≤ ₹5,00,000' },
      { id: 'r3', field_key: 'course', operator: 'in', value: 'PhD,MPhil', action: 'PASS', message: 'Course must be PhD or MPhil' },
      { id: 'r4', field_key: 'marks_percentage', operator: 'gte', value: '55', action: 'PASS', message: 'Minimum 55% in qualifying degree' }
    ],
    score_weights: [
      { id: 'w1', component: 'Academics (PG Marks)', weight: 50, description: 'Direct percentage scaled to 50 points' },
      { id: 'w2', component: 'Research Proposal Evaluation', weight: 30, description: 'Assessment by peer panel on tribal relevance' },
      { id: 'w3', component: 'Vulnerability / Income Index', weight: 20, description: 'Lower income brackets receive higher vulnerability score' }
    ],
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'nos-int-2026',
    code: 'NOS-INT-2026',
    name: 'National Overseas Scholarship for Scheduled Tribe Candidates',
    description: "Full sponsorship for Master's and Ph.D. degrees in QS Top 500 universities in Engineering, Medical Sciences, Agricultural Technology, and Natural Sciences abroad.",
    department: 'Ministry of Tribal Affairs • International Relations Bureau',
    education_level: 'Masters',
    target_category: 'ST',
    income_limit: 600000,
    age_min: 18,
    age_max: 35,
    seats: 20,
    start_date: new Date(Date.now() - 20 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 57 * 86400000).toISOString(),
    status: 'active',
    is_published: true,
    current_version: 1,
    fields: [
      { id: 'f201', field_key: 'full_name', label: 'Full Name', field_type: 'text', required: true, order_index: 0 },
      { id: 'f202', field_key: 'category', label: 'Category', field_type: 'radio', options: ['ST'], required: true, order_index: 1 },
      { id: 'f203', field_key: 'annual_family_income', label: 'Annual Income (₹)', field_type: 'number', required: true, order_index: 2 }
    ],
    documents: [
      { id: 'd201', document_key: 'st_certificate', document_name: 'ST Certificate', required: true, allowed_file_types: ['image/jpeg', 'image/png', 'application/pdf'], max_size_mb: 5, validity_required: false, help_text: 'Community certificate', order_index: 0 }
    ],
    rules: [
      { id: 'r201', field_key: 'category', operator: 'eq', value: 'ST', action: 'PASS', message: 'Category must be ST' }
    ],
    score_weights: [],
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pms-state-tr-09',
    code: 'PMS-STATE-TR-09',
    name: 'State Post-Matric Scholarship Scheme for Tribal Students',
    description: 'Comprehensive maintenance grant covering boarding, books, exam fees, and study tours for students enrolled in professional polytechnics, degree colleges, and universities across tribal focus districts.',
    department: 'Jharkhand / Madhya Pradesh / Odisha Welfare Consortium',
    education_level: 'Undergraduate',
    target_category: 'ST',
    income_limit: 250000,
    age_min: 17,
    age_max: 30,
    seats: 10000,
    start_date: new Date(Date.now() - 15 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 22 * 86400000).toISOString(),
    status: 'active',
    is_published: true,
    current_version: 1,
    fields: [],
    documents: [],
    rules: [],
    score_weights: [],
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  }
]

let applications: any[] = [
  {
    id: 'app-demo-01',
    applicant_id: 'app-prof-1',
    scheme_id: 'mota-edu-881',
    scheme_name: 'National Fellowship and Scholarship for Higher Education of ST Students',
    applicant_name: 'Ayush M.',
    applicant_district: 'East Singhbhum',
    applicant_state: 'Jharkhand',
    scheme_version: 1,
    status: 'OFFICER_SCRUTINY',
    current_stage: 'OFFICER_SCRUTINY',
    data: {
      full_name: 'Ayush M.',
      dob: '2003-05-18',
      gender: 'Male',
      category: 'ST',
      state: 'Jharkhand',
      district: 'East Singhbhum',
      mobile: '9876543210',
      email: 'ayusheditor1503@gmail.com',
      course: 'B.Tech Electrical & Electronics',
      institute_name: 'NIT Jamshedpur',
      admission_year: 2022,
      annual_family_income: 210000,
      marks_percentage: 84.2
    },
    verification_priority: {
      score: 55,
      level: 'Medium',
      reasons: ['Income certificate re-attestation requested for FY 2025-26', 'DigiLocker ST identity verified']
    },
    merit_score: 88.0,
    eligibility_result: {
      overall: 'PASS',
      rules_evaluated: [
        { field: 'category', rule: 'Must be ST', actual: 'ST', status: 'PASS', note: 'Category matches scheme criteria' },
        { field: 'annual_family_income', rule: '≤ ₹2,50,000', actual: '₹2,10,000', status: 'PASS', note: 'Income within permissible limits' },
        { field: 'course', rule: 'B.Tech / Higher Studies', actual: 'B.Tech', status: 'PASS', note: 'Enrolled in eligible degree' }
      ]
    },
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  }
]

let documents: any[] = [
  {
    id: 'doc-1',
    application_id: 'app-demo-01',
    document_key: 'st_certificate',
    document_name: 'ST Certificate',
    file_name: 'st_certificate_ayush.pdf',
    file_url: '/samples/authentic_st_certificate.jpg',
    status: 'VERIFIED',
    verification_status: 'VERIFIED',
    ocr_status: 'COMPLETED',
    extracted_data: {
      full_name: 'Ayush M.',
      caste_tribe: 'Santhal (ST)',
      certificate_number: 'JH/ST/2021/8491',
      issuing_authority: 'Sub-Divisional Officer, Jamshedpur',
      issue_date: '2021-06-15'
    },
    quality_score: 96,
    forensic: {
      level: 'Low',
      score: 12,
      verdict: 'Clear authentic document scan',
      recommendation: 'Document verified via DigiLocker ID #8491',
      disclaimer: 'Advisory analysis.',
      model: 'DocForensic-v2.1',
      evidence: ['Uniform noise variance', 'Single JPEG compression layer', 'Standard government template typography'],
      factors: [
        { name: 'DigiLocker e-Sign', value: 'Validated', status: 'PASS', detail: 'Authenticated with Central ST Registry' }
      ]
    },
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  }
]

let auditLogs: any[] = [
  { id: 'aud-1', actor_id: 'u-applicant', actor_role: 'applicant', action: 'APPLICATION_CREATED', entity: 'application', entity_id: 'app-demo-01', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'aud-2', actor_id: 'u-officer', actor_role: 'district_officer', action: 'SCRUTINY_OPENED', entity: 'application', entity_id: 'app-demo-01', created_at: new Date(Date.now() - 2 * 86400000).toISOString() }
]

let notifications: any[] = [
  { id: 'notif-1', user_id: 'u-applicant', type: 'info', title: 'Income Certificate Expired', message: 'The Sponsoring Authority requested your re-attested Annual Income Certificate for FY 2025-26.', created_at: new Date(Date.now() - 1 * 86400000).toISOString() }
]

let appeals: any[] = []
let grievances: any[] = []

const makeToken = (user: any) => `demo_jwt_token_${user.id}_${Date.now()}`

// -------------------------------------------------------------
// Router definitions supporting /api/v1 and /v1 prefixes
// -------------------------------------------------------------
const router = express.Router()

router.get(['/health', '/'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'tribal-scholar-api',
    api_version: 'v1',
    environment: 'production',
    timestamp: new Date().toISOString()
  })
})

// Auth
router.post('/auth/login', (req, res) => {
  const { email } = req.body
  const user = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase()) || users[0]
  const token = makeToken(user)
  res.json({
    access_token: token,
    refresh_token: `refresh_${token}`,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      phone: user.phone
    }
  })
})

router.post('/auth/register', (req, res) => {
  const { email, full_name, phone } = req.body
  const newUser = {
    id: `u-${Date.now()}`,
    email: email || 'applicant@demo.local',
    full_name: full_name || 'Applicant',
    roles: ['applicant'],
    phone: phone || ''
  }
  users.push(newUser)
  const token = makeToken(newUser)
  res.json({ access_token: token, refresh_token: `refresh_${token}`, user: newUser })
})

router.get('/auth/me', (req, res) => {
  res.json(users[0])
})

router.post('/auth/refresh', (req, res) => {
  res.json({ access_token: makeToken(users[0]), user: users[0] })
})

router.post('/auth/otp/verify', (req, res) => {
  res.json({ verified: true, message: 'OTP verified' })
})

router.post('/auth/otp/request', (req, res) => {
  res.json({ success: true, message: 'Mock OTP: 123456' })
})

// Profile
router.get('/profile', (req, res) => {
  res.json({
    user: users[0],
    applicant: applicantProfile,
    institute: institutes[1]
  })
})

router.put('/profile', (req, res) => {
  applicantProfile = { ...applicantProfile, ...req.body }
  res.json({ applicant: applicantProfile, message: 'Profile updated' })
})

// Schemes
router.get('/schemes', (req, res) => {
  res.json({ items: schemes, total: schemes.length, page: 1, page_size: 20 })
})

router.get('/schemes/:id', (req, res) => {
  const s = schemes.find(item => item.id === req.params.id) || schemes[0]
  res.json(s)
})

router.post('/admin/schemes', (req, res) => {
  const newScheme = { ...req.body, id: `scheme-${Date.now()}`, created_at: new Date().toISOString() }
  schemes.unshift(newScheme)
  res.json(newScheme)
})

router.put('/admin/schemes/:id', (req, res) => {
  const idx = schemes.findIndex(s => s.id === req.params.id)
  if (idx !== -1) schemes[idx] = { ...schemes[idx], ...req.body }
  res.json(schemes[idx] || schemes[0])
})

router.post('/admin/schemes/:id/publish', (req, res) => {
  res.json({ message: 'Scheme published', scheme: schemes[0] })
})

router.post('/admin/schemes/:id/duplicate', (req, res) => {
  const cloned = { ...schemes[0], id: `scheme-${Date.now()}`, name: `${schemes[0].name} (Copy)` }
  schemes.unshift(cloned)
  res.json(cloned)
})

router.get('/admin/schemes/:id/versions', (req, res) => {
  res.json({ versions: [{ version: 1, created_at: new Date().toISOString() }] })
})

router.post('/admin/scheme-simulator/:id', (req, res) => {
  res.json({
    scheme_id: req.params.id,
    simulated_applicants: 150,
    eligible_count: 118,
    pass_rate_pct: 78.7
  })
})

// Applications
router.get('/applications', (req, res) => {
  res.json({ items: applications, total: applications.length, page: 1, page_size: 20 })
})

router.post('/applications', (req, res) => {
  const newApp = {
    id: `app-${Date.now()}`,
    applicant_id: 'app-prof-1',
    scheme_id: req.body.scheme_id || schemes[0].id,
    scheme_name: schemes[0].name,
    applicant_name: applicantProfile.full_name,
    applicant_district: applicantProfile.district,
    applicant_state: applicantProfile.state,
    status: 'DRAFT',
    current_stage: 'DRAFT',
    data: req.body.data || {},
    verification_priority: { score: 20, level: 'Low' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  applications.unshift(newApp)
  res.json({ id: newApp.id, status: newApp.status, message: 'Application draft created' })
})

router.get('/applications/:id', (req, res) => {
  const appItem = applications.find(a => a.id === req.params.id) || applications[0]
  res.json({
    ...appItem,
    scheme: schemes[0],
    applicant: applicantProfile,
    documents,
    status_history: [
      { from_status: null, to_status: 'DRAFT', created_at: appItem.created_at },
      { from_status: 'DRAFT', to_status: appItem.status, created_at: appItem.updated_at }
    ]
  })
})

router.put('/applications/:id', (req, res) => {
  const appItem = applications.find(a => a.id === req.params.id) || applications[0]
  appItem.data = { ...appItem.data, ...req.body.data }
  res.json({ message: 'Application updated', application: appItem })
})

router.post('/applications/:id/submit', (req, res) => {
  const appItem = applications.find(a => a.id === req.params.id) || applications[0]
  appItem.status = 'SUBMITTED'
  res.json({ message: 'Application submitted', status: appItem.status })
})

router.post('/applications/:id/evaluate', (req, res) => {
  res.json({
    eligibility: { overall: 'PASS', rules_evaluated: [] },
    merit_score: 85,
    verification_priority: { score: 45, level: 'Medium' }
  })
})

router.post('/applications/:id/transition', (req, res) => {
  res.json({ status: req.body.to_status || 'VERIFIED', message: 'Status updated' })
})

// Documents
router.get('/applications/:id/documents', (req, res) => {
  res.json({ items: documents })
})

router.post('/applications/:id/documents', upload.single('file') as any, (req, res) => {
  const newDoc = {
    id: `doc-${Date.now()}`,
    application_id: req.params.id,
    document_key: req.body.document_key || 'income_certificate',
    document_name: 'Income Certificate FY 2025-26',
    file_name: req.file ? req.file.originalname : 'income_cert.pdf',
    status: 'VERIFIED',
    extracted_data: { annual_income: '210000', validity: '2026-03-31' },
    created_at: new Date().toISOString()
  }
  documents.push(newDoc)
  res.json(newDoc)
})

router.get('/documents/:id', (req, res) => {
  res.json(documents[0])
})

router.post('/documents/:id/verify', (req, res) => {
  res.json({ message: 'Document verified' })
})

router.post('/documents/scan', upload.single('file') as any, (req, res) => {
  res.json({
    document_key: req.body.document_key || 'income_certificate',
    quality: { score: 95, level: 'Good' },
    forensic: { level: 'Low', score: 14, verdict: 'Valid document' }
  })
})

// Officer
router.get('/officer/queue', (req, res) => {
  res.json({ items: applications, total: applications.length })
})

router.get('/officer/applications/:id', (req, res) => {
  res.json({
    application: applications[0],
    applicant: applicantProfile,
    scheme: schemes[0],
    documents
  })
})

router.post('/officer/applications/:id/decision', (req, res) => {
  res.json({ message: 'Decision recorded', status: req.body.decision })
})

router.get('/officer/dashboard/stats', (req, res) => {
  res.json({
    total_in_queue: applications.length,
    under_scrutiny: 1,
    verified_count: 5,
    deficiency_count: 0
  })
})

// Committee
router.get('/committee/candidates', (req, res) => {
  res.json({ candidates: applications })
})

router.post('/committee/decision', (req, res) => {
  res.json({ message: 'Decisions recorded' })
})

router.get('/committee/selection-lists', (req, res) => {
  res.json({ selection_lists: [] })
})

// Admin
router.get('/admin/dashboard', (req, res) => {
  res.json({
    total_applications: 42,
    total_schemes: schemes.length,
    by_status: [{ status: 'SUBMITTED', count: 18 }, { status: 'SELECTED', count: 12 }],
    verification_priority_distribution: { Low: 28, Medium: 10, High: 4 }
  })
})

router.get('/admin/audit', (req, res) => {
  res.json({ items: auditLogs, total: auditLogs.length })
})

router.get('/admin/analytics', (req, res) => {
  res.json({
    monthly_trend: [{ month: 'Aug', applications: 120 }, { month: 'Sep', applications: 168 }],
    gender_distribution: [{ gender: 'Female', count: 88 }, { gender: 'Male', count: 76 }]
  })
})

router.get('/admin/fairness', (req, res) => {
  res.json({
    fairness_metrics: { overall_disparate_impact_ratio: 0.94, status: 'FAIR' }
  })
})

router.get('/admin/simulator', (req, res) => {
  res.json({ active_schemes: schemes })
})

router.get('/admin/users', (req, res) => {
  res.json({ users })
})

router.get('/admin/notifications', (req, res) => {
  res.json({ items: notifications })
})

// Appeals
router.get('/appeals', (req, res) => {
  res.json({ items: appeals })
})

router.post('/appeals', (req, res) => {
  const newAppeal = { id: `appeal-${Date.now()}`, ...req.body, status: 'SUBMITTED' }
  appeals.unshift(newAppeal)
  res.json(newAppeal)
})

router.get('/grievances', (req, res) => {
  res.json({ items: grievances })
})

router.post('/grievances', (req, res) => {
  const newGrv = { id: `grv-${Date.now()}`, ...req.body, status: 'OPEN' }
  grievances.unshift(newGrv)
  res.json(newGrv)
})

// Chatbot
router.post('/chatbot/chat', (req, res) => {
  const msg = (req.body.message || '').toLowerCase()
  let reply = 'Tribal AI Scholar assists with scholarship matching, dynamic eligibility rules, and document verification. How may I help you today?'
  if (msg.includes('income') || msg.includes('certificate')) {
    reply = 'Income certificates for MoTA central sector schemes must be issued by a Sub-Divisional Officer (SDO) or Circle Officer (CO) for the current financial year.'
  } else if (msg.includes('eligib')) {
    reply = 'Your profile is currently matched with 3 national schemes with match scores between 92% and 99%.'
  }
  res.json({ reply, quick_replies: ['Check eligibility', 'Upload income doc', 'View deadlines'] })
})

router.get('/chatbot/suggested', (req, res) => {
  res.json({ questions: ['Am I eligible for MoTA Fellowship?', 'How to re-submit expired income certificate?'] })
})

// ML
router.post('/ml/photo-scan', upload.single('file') as any, (req, res) => {
  res.json({
    document_key: 'income_certificate',
    quality: { score: 94, level: 'Good', is_blurry: false },
    classification: { predicted_type: 'income_certificate', confidence: 0.98 },
    forensic: {
      score: 15,
      level: 'Low',
      verdict: 'Authentic certificate verified',
      recommendation: 'Document cleared for officer approval',
      disclaimer: 'Advisory analysis.',
      model: 'TribalScholar-Forensic-v2.1',
      evidence: ['Consistent JPEG quantization', 'Uniform noise texture'],
      factors: [
        { name: 'ELA Recompression', value: '3.9%', status: 'PASS', detail: 'No secondary compression' },
        { name: 'Blur Variance', value: 'Uniform', status: 'PASS', detail: 'Natural depth variance' }
      ]
    }
  })
})

router.post('/ml/eligibility', (req, res) => {
  res.json({ eligible: true, confidence: 0.99, model: 'DeterministicEligibilityEngine-v1.0' })
})

router.post('/ml/document-classify', (req, res) => {
  res.json({ predicted_type: 'st_certificate', confidence: 0.97 })
})

router.post('/ml/verification-priority', (req, res) => {
  res.json({ score: 45, level: 'Medium', recommendation: 'Standard review queue' })
})

router.post('/ml/fairness-audit', (req, res) => {
  res.json({ demographic_parity: 0.96, disparate_impact_ratio: 0.94, status: 'FAIR' })
})

router.get('/ml/models', (req, res) => {
  res.json({
    models: [
      { name: 'Eligibility Rule Engine', version: 'v1.0-deterministic' },
      { name: 'DocForensic Photo Scan', version: 'v2.1' },
      { name: 'Sahayak Chatbot', version: 'v2.0' }
    ]
  })
})

// Mount router on multiple common paths
app.use('/api/v1', router)
app.use('/v1', router)
app.use('/api', router)
app.use('/', router)

export default app
