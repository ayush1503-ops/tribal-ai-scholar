import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

// Setup multer for in-memory file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})

// Ensure uploads dir
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

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
  { id: 'u-applicant', email: 'applicant@demo.local', full_name: 'Laxmi Hembram', roles: ['applicant'], phone: '9876543210' },
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
  full_name: 'Laxmi Hembram',
  dob: '1998-04-12',
  gender: 'Female',
  category: 'ST',
  state: 'Jharkhand',
  district: 'Ranchi',
  mobile: '9876543210',
  email: 'applicant@demo.local',
  address: 'Village Hesag, Ranchi, Jharkhand - 834001',
  institute_id: 'inst-1',
  course: 'PhD',
  admission_year: 2023,
  annual_family_income: 240000,
  parent_name: 'Sunil Hembram',
  bank_account_placeholder: 'XXXX-XXXX-1234 (Demo)'
}

let schemes = [
  {
    id: 'scheme-1',
    name: 'National Fellowship for ST Students — Demo',
    description: 'A demo fellowship scheme for ST students pursuing higher education (MPhil/PhD). Provides financial assistance and contingency grant for research.',
    department: 'Ministry of Tribal Affairs (Demo)',
    education_level: 'PhD',
    target_category: 'ST',
    income_limit: 500000,
    age_min: 18,
    age_max: 35,
    seats: 100,
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
    id: 'scheme-2',
    name: 'Top Class Education Scheme for ST Students',
    description: 'Financial support for ST students who have secured admission in notified premier institutions (IITs, IIMs, NITs, Central Universities).',
    department: 'Ministry of Tribal Affairs (Demo)',
    education_level: 'Masters',
    target_category: 'ST',
    income_limit: 800000,
    age_min: 18,
    age_max: 30,
    seats: 250,
    start_date: new Date(Date.now() - 20 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 45 * 86400000).toISOString(),
    status: 'active',
    is_published: true,
    current_version: 1,
    fields: [
      { id: 'f201', field_key: 'full_name', label: 'Full Name', field_type: 'text', required: true, order_index: 0 },
      { id: 'f202', field_key: 'category', label: 'Category', field_type: 'radio', options: ['ST'], required: true, order_index: 1 },
      { id: 'f203', field_key: 'institute_name', label: 'Notified Institute', field_type: 'text', required: true, order_index: 2 },
      { id: 'f204', field_key: 'annual_family_income', label: 'Annual Income (₹)', field_type: 'number', required: true, order_index: 3 }
    ],
    documents: [
      { id: 'd201', document_key: 'st_certificate', document_name: 'ST Certificate', required: true, allowed_file_types: ['image/jpeg', 'image/png', 'application/pdf'], max_size_mb: 5, validity_required: false, help_text: 'Community certificate', order_index: 0 },
      { id: 'd202', document_key: 'income_certificate', document_name: 'Income Certificate', required: true, allowed_file_types: ['image/jpeg', 'image/png', 'application/pdf'], max_size_mb: 5, validity_required: true, help_text: 'Current year certificate', order_index: 1 }
    ],
    rules: [
      { id: 'r201', field_key: 'category', operator: 'eq', value: 'ST', action: 'PASS', message: 'Category must be ST' },
      { id: 'r202', field_key: 'annual_family_income', operator: 'lte', value: '800000', action: 'PASS', message: 'Annual family income must be ≤ ₹8,00,000' }
    ],
    score_weights: [
      { id: 'w201', component: 'Entrance Merit Rank', weight: 60, description: 'Rank in national exam' },
      { id: 'w202', component: 'Income Vulnerability', weight: 40, description: 'Socio-economic weighting' }
    ],
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  }
]

let applications: any[] = [
  {
    id: 'app-demo-01',
    applicant_id: 'app-prof-1',
    scheme_id: 'scheme-1',
    scheme_name: 'National Fellowship for ST Students — Demo',
    applicant_name: 'Laxmi Hembram',
    applicant_district: 'Ranchi',
    applicant_state: 'Jharkhand',
    scheme_version: 1,
    status: 'OFFICER_SCRUTINY',
    current_stage: 'OFFICER_SCRUTINY',
    data: {
      full_name: 'Laxmi Hembram',
      dob: '1998-04-12',
      gender: 'Female',
      category: 'ST',
      state: 'Jharkhand',
      district: 'Ranchi',
      mobile: '9876543210',
      email: 'applicant@demo.local',
      course: 'PhD',
      research_area: 'Tribal Cultural Heritage & Ethnobotany',
      institute_name: 'Ranchi University',
      admission_year: 2023,
      annual_family_income: 240000,
      parent_name: 'Sunil Hembram',
      research_proposal_title: 'Ethnobotanical Traditions of the Santhal and Munda Communities in Chota Nagpur',
      research_proposal_summary: 'This doctoral study documents traditional ecological knowledge and medicinal plant conservation practices among indigenous tribal communities.',
      marks_percentage: 78.5
    },
    verification_priority: {
      score: 55,
      level: 'Medium',
      reasons: ['Spelling variation on marksheet (Hembrom vs Hembram, 92% similarity) - manual review recommended', 'Income verified under ceiling']
    },
    merit_score: 82.5,
    eligibility_result: {
      overall: 'PASS',
      rules_evaluated: [
        { field: 'category', rule: 'Must be ST', actual: 'ST', status: 'PASS', note: 'Category matches scheme criteria' },
        { field: 'annual_family_income', rule: '≤ ₹5,00,000', actual: '₹2,40,000', status: 'PASS', note: 'Income within permissible limits' },
        { field: 'course', rule: 'PhD or MPhil', actual: 'PhD', status: 'PASS', note: 'Enrolled in eligible degree' },
        { field: 'marks_percentage', rule: '≥ 55%', actual: '78.5%', status: 'PASS', note: 'Qualifying marks satisfy merit requirement' }
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
    file_name: 'st_certificate_laxmi.pdf',
    file_url: '/samples/authentic_st_certificate.jpg',
    status: 'VERIFIED',
    verification_status: 'VERIFIED',
    ocr_status: 'COMPLETED',
    extracted_data: {
      full_name: 'Laxmi Hembram',
      caste_tribe: 'Santhal (ST)',
      certificate_number: 'JH/ST/2021/88941',
      issuing_authority: 'Sub-Divisional Officer, Ranchi',
      issue_date: '2021-06-15'
    },
    quality_score: 95,
    forensic: {
      level: 'Low',
      score: 12,
      verdict: 'Clear authentic document scan',
      recommendation: 'Document appears consistent and suitable for routine verification',
      disclaimer: 'Advisory analysis based on digital signals. Verification authority retains final decision authority.',
      model: 'DocForensic-v2.1',
      evidence: ['Uniform noise variance', 'Single JPEG compression layer', 'Standard government template typography'],
      factors: [
        { name: 'ELA Recompression', value: '4.2%', status: 'PASS', detail: 'No secondary recompression artifacts' },
        { name: 'Blur Consistency', value: 'Uniform', status: 'PASS', detail: 'Laplacian variance evenly distributed' },
        { name: 'Noise Texture', value: 'Consistent', status: 'PASS', detail: 'Sensor noise matched across quadrants' },
        { name: 'Typography & Edges', value: 'Sharp', status: 'PASS', detail: 'No cut-and-paste edge boundaries detected' }
      ]
    },
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'doc-2',
    application_id: 'app-demo-01',
    document_key: 'income_certificate',
    document_name: 'Income Certificate',
    file_name: 'income_cert_2023.pdf',
    file_url: '/samples/authentic_st_certificate.jpg',
    status: 'PENDING',
    verification_status: 'PENDING',
    ocr_status: 'COMPLETED',
    extracted_data: {
      annual_income: '240000',
      parent_name: 'Sunil Hembram',
      certificate_number: 'INC/JH/2023/10291',
      issue_date: '2023-04-10'
    },
    quality_score: 92,
    forensic: {
      level: 'Low',
      score: 18,
      verdict: 'Valid income certificate structure',
      recommendation: 'Annual income ₹2,40,000 matches applicant claim',
      disclaimer: 'Advisory analysis.',
      model: 'DocForensic-v2.1',
      evidence: ['Valid digital signature block detected', 'Date within current fiscal year'],
      factors: [
        { name: 'Date Validity', value: 'Valid', status: 'PASS', detail: 'Issued April 2023' },
        { name: 'Income Amount Match', value: 'Exact', status: 'PASS', detail: '₹2,40,000 matches declaration' }
      ]
    },
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'doc-3',
    application_id: 'app-demo-01',
    document_key: 'marksheet',
    document_name: 'Post-Graduation Marksheet',
    file_name: 'pg_marksheet.pdf',
    file_url: '/samples/fake_screenshot_lowres.jpg',
    status: 'PENDING',
    verification_status: 'PENDING',
    ocr_status: 'COMPLETED',
    extracted_data: {
      student_name: 'Laxmi Hembrom',
      percentage: '78.5%',
      degree: 'M.A. Anthropology',
      university: 'Ranchi University',
      year: '2022'
    },
    quality_score: 78,
    forensic: {
      level: 'Medium',
      score: 45,
      verdict: 'Minor phonetic spelling variation in surname (Hembrom vs Hembram)',
      recommendation: 'Officer review recommended: tribal surname phonetic variation common in local dialects',
      disclaimer: 'Advisory check. Do not automatically reject for minor spelling variations.',
      model: 'FuzzyMatch-v1.4',
      evidence: ['Phonetic similarity 92%', 'Roll number and university match applicant record'],
      factors: [
        { name: 'Name Similarity', value: '92%', status: 'WARN', detail: 'Hembrom vs Hembram (Levenshtein distance 1)' },
        { name: 'Marks Verification', value: '78.5%', status: 'PASS', detail: 'Above minimum 55% criteria' }
      ]
    },
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  }
]

let auditLogs: any[] = [
  { id: 'aud-1', actor_id: 'u-applicant', actor_role: 'applicant', action: 'APPLICATION_CREATED', entity: 'application', entity_id: 'app-demo-01', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'aud-2', actor_id: 'u-applicant', actor_role: 'applicant', action: 'DOCUMENTS_UPLOADED', entity: 'application', entity_id: 'app-demo-01', created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'aud-3', actor_id: 'u-applicant', actor_role: 'applicant', action: 'APPLICATION_SUBMITTED', entity: 'application', entity_id: 'app-demo-01', created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'aud-4', actor_id: 'u-officer', actor_role: 'district_officer', action: 'SCRUTINY_OPENED', entity: 'application', entity_id: 'app-demo-01', created_at: new Date(Date.now() - 2 * 86400000).toISOString() }
]

let notifications: any[] = [
  { id: 'notif-1', user_id: 'u-applicant', type: 'info', title: 'Application Submitted', message: 'Your application for National Fellowship for ST Students is under officer scrutiny.', created_at: new Date(Date.now() - 4 * 86400000).toISOString() }
]

let appeals: any[] = []
let grievances: any[] = []

// Helper for generating tokens
const makeToken = (user: any) => `demo_jwt_token_${user.id}_${Date.now()}`

// -------------------------------------------------------------
// Health Endpoints
// -------------------------------------------------------------
app.get(['/health', '/api/health', '/api/v1/health'], (req, res) => {
  res.json({
    status: 'ok',
    prototype: true,
    service: 'tribal-scholar-api',
    api_version: 'v1',
    environment: 'production',
    timestamp: new Date().toISOString()
  })
})

// -------------------------------------------------------------
// Auth Routes (/api/v1/auth)
// -------------------------------------------------------------
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body
  const user = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase())

  if (user) {
    const token = makeToken(user)
    return res.json({
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
  }

  // If user not in default list, create dynamic demo user
  const newUser = {
    id: `u-${Date.now()}`,
    email: email || 'applicant@demo.local',
    full_name: (email || 'Applicant').split('@')[0],
    roles: ['applicant'],
    phone: '9876543210'
  }
  users.push(newUser)
  const token = makeToken(newUser)
  return res.json({
    access_token: token,
    refresh_token: `refresh_${token}`,
    user: newUser
  })
})

app.post('/api/v1/auth/register', (req, res) => {
  const { email, full_name, phone } = req.body
  const existing = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase())
  if (existing) {
    const token = makeToken(existing)
    return res.json({ access_token: token, refresh_token: `refresh_${token}`, user: existing })
  }
  const newUser = {
    id: `u-${Date.now()}`,
    email,
    full_name: full_name || 'New Applicant',
    roles: ['applicant'],
    phone: phone || ''
  }
  users.push(newUser)
  const token = makeToken(newUser)
  res.json({ access_token: token, refresh_token: `refresh_${token}`, user: newUser })
})

app.get('/api/v1/auth/me', (req, res) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')
  let user = users[0]
  if (token) {
    const matched = users.find(u => token.includes(u.id))
    if (matched) user = matched
  }
  res.json({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    roles: user.roles
  })
})

app.post('/api/v1/auth/refresh', (req, res) => {
  const user = users[0]
  const token = makeToken(user)
  res.json({ access_token: token, user })
})

app.post('/api/v1/auth/otp/verify', (req, res) => {
  res.json({ verified: true, message: 'OTP verified successfully' })
})

app.post('/api/v1/auth/otp/request', (req, res) => {
  res.json({ success: true, message: 'Mock OTP sent: 123456' })
})

// -------------------------------------------------------------
// Profile Routes (/api/v1/profile)
// -------------------------------------------------------------
app.get('/api/v1/profile', (req, res) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')
  const user = users.find(u => token.includes(u.id)) || demoUsers[0]
  res.json({
    user,
    applicant: applicantProfile,
    institute: institutes[0]
  })
})

app.put('/api/v1/profile', (req, res) => {
  applicantProfile = { ...applicantProfile, ...req.body }
  res.json({ applicant: applicantProfile, message: 'Profile updated successfully' })
})

// -------------------------------------------------------------
// Schemes Routes (/api/v1/schemes)
// -------------------------------------------------------------
app.get('/api/v1/schemes', (req, res) => {
  const { search, category, education_level, status } = req.query
  let list = [...schemes]
  if (search) {
    const s = String(search).toLowerCase()
    list = list.filter(item => item.name.toLowerCase().includes(s) || item.description.toLowerCase().includes(s))
  }
  if (category) {
    list = list.filter(item => item.target_category.toLowerCase() === String(category).toLowerCase())
  }
  if (education_level) {
    list = list.filter(item => item.education_level.toLowerCase() === String(education_level).toLowerCase())
  }
  if (status) {
    list = list.filter(item => item.status === status)
  }
  res.json({
    items: list,
    total: list.length,
    page: 1,
    page_size: 20
  })
})

app.get('/api/v1/schemes/:id', (req, res) => {
  const scheme = schemes.find(s => s.id === req.params.id)
  if (!scheme) return res.status(404).json({ detail: 'Scheme not found' })
  res.json(scheme)
})

app.post('/api/v1/admin/schemes', (req, res) => {
  const newScheme = {
    id: `scheme-${Date.now()}`,
    name: req.body.name || 'Untitled Scheme',
    description: req.body.description || '',
    department: req.body.department || 'Ministry of Tribal Affairs',
    education_level: req.body.education_level || 'PhD',
    target_category: req.body.target_category || 'ST',
    income_limit: Number(req.body.income_limit) || 500000,
    age_min: Number(req.body.age_min) || 18,
    age_max: Number(req.body.age_max) || 35,
    seats: Number(req.body.seats) || 50,
    start_date: req.body.start_date || new Date().toISOString(),
    end_date: req.body.end_date || new Date(Date.now() + 60 * 86400000).toISOString(),
    status: 'draft',
    is_published: false,
    current_version: 1,
    fields: req.body.fields || [],
    documents: req.body.documents || [],
    rules: req.body.rules || [],
    score_weights: req.body.score_weights || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  schemes.unshift(newScheme)
  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    actor_id: 'u-admin',
    actor_role: 'super_admin',
    action: 'SCHEME_CREATED',
    entity: 'scheme',
    entity_id: newScheme.id,
    created_at: new Date().toISOString()
  })
  res.json(newScheme)
})

app.put('/api/v1/admin/schemes/:id', (req, res) => {
  const idx = schemes.findIndex(s => s.id === req.params.id)
  if (idx === -1) return res.status(404).json({ detail: 'Scheme not found' })
  schemes[idx] = { ...schemes[idx], ...req.body, updated_at: new Date().toISOString() }
  res.json(schemes[idx])
})

app.post('/api/v1/admin/schemes/:id/publish', (req, res) => {
  const scheme = schemes.find(s => s.id === req.params.id)
  if (!scheme) return res.status(404).json({ detail: 'Scheme not found' })
  scheme.is_published = true
  scheme.status = 'active'
  scheme.updated_at = new Date().toISOString()
  res.json({ message: 'Scheme published successfully', scheme })
})

app.post('/api/v1/admin/schemes/:id/duplicate', (req, res) => {
  const orig = schemes.find(s => s.id === req.params.id)
  if (!orig) return res.status(404).json({ detail: 'Scheme not found' })
  const cloned = {
    ...orig,
    id: `scheme-${Date.now()}`,
    name: `${orig.name} (Copy)`,
    is_published: false,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  schemes.unshift(cloned)
  res.json(cloned)
})

app.get('/api/v1/admin/schemes/:id/versions', (req, res) => {
  res.json({
    versions: [
      { version: 1, created_at: new Date(Date.now() - 30 * 86400000).toISOString(), created_by: 'Priya Singh', changes: 'Initial published version' }
    ]
  })
})

app.post('/api/v1/admin/scheme-simulator/:id', (req, res) => {
  const scheme = schemes.find(s => s.id === req.params.id) || schemes[0]
  res.json({
    scheme_id: scheme.id,
    simulated_applicants: 150,
    eligible_count: 118,
    ineligible_count: 32,
    pass_rate_pct: 78.7,
    estimated_budget: 118 * 45000,
    impact_analysis: {
      female_pct: 46.2,
      male_pct: 53.8,
      pvtg_share_pct: 18.5,
      avg_turnaround_days: 2.8
    }
  })
})

// -------------------------------------------------------------
// Applications Routes (/api/v1/applications)
// -------------------------------------------------------------
app.get('/api/v1/applications', (req, res) => {
  const { scheme_id, status } = req.query
  let list = [...applications]
  if (scheme_id) list = list.filter(a => a.scheme_id === scheme_id)
  if (status) list = list.filter(a => a.status === status)
  res.json({ items: list, total: list.length, page: 1, page_size: 20 })
})

app.post('/api/v1/applications', (req, res) => {
  const { scheme_id, data } = req.body
  const scheme = schemes.find(s => s.id === scheme_id)
  if (!scheme) return res.status(404).json({ detail: 'Scheme not found' })

  const existing = applications.find(a => a.applicant_id === 'app-prof-1' && a.scheme_id === scheme_id && !['REJECTED', 'WITHDRAWN'].includes(a.status))
  if (existing) {
    return res.status(400).json({ detail: 'Application already exists for this scheme' })
  }

  const newApp = {
    id: `app-${Date.now()}`,
    applicant_id: 'app-prof-1',
    scheme_id: scheme.id,
    scheme_name: scheme.name,
    applicant_name: applicantProfile.full_name,
    applicant_district: applicantProfile.district,
    applicant_state: applicantProfile.state,
    scheme_version: scheme.current_version,
    status: 'DRAFT',
    current_stage: 'DRAFT',
    data: data || {},
    verification_priority: { score: 20, level: 'Low', reasons: ['New draft application'] },
    merit_score: 75,
    eligibility_result: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  applications.unshift(newApp)

  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    actor_id: 'u-applicant',
    actor_role: 'applicant',
    action: 'APPLICATION_CREATED',
    entity: 'application',
    entity_id: newApp.id,
    created_at: new Date().toISOString()
  })

  res.json({ id: newApp.id, status: newApp.status, message: 'Application draft created' })
})

app.get('/api/v1/applications/:id', (req, res) => {
  const appItem = applications.find(a => a.id === req.params.id)
  if (!appItem) return res.status(404).json({ detail: 'Application not found' })
  const scheme = schemes.find(s => s.id === appItem.scheme_id) || schemes[0]
  const appDocs = documents.filter(d => d.application_id === appItem.id)

  res.json({
    ...appItem,
    scheme,
    applicant: applicantProfile,
    documents: appDocs,
    status_history: [
      { from_status: null, to_status: 'DRAFT', actor_role: 'applicant', reason: 'Draft initiated', created_at: appItem.created_at },
      { from_status: 'DRAFT', to_status: 'SUBMITTED', actor_role: 'applicant', reason: 'Submitted by student', created_at: appItem.created_at },
      { from_status: 'SUBMITTED', to_status: appItem.status, actor_role: 'system', reason: 'Workflow stage progression', created_at: appItem.updated_at }
    ]
  })
})

app.put('/api/v1/applications/:id', (req, res) => {
  const appItem = applications.find(a => a.id === req.params.id)
  if (!appItem) return res.status(404).json({ detail: 'Application not found' })
  appItem.data = { ...appItem.data, ...req.body.data }
  appItem.updated_at = new Date().toISOString()
  res.json({ message: 'Application updated', application: appItem })
})

app.post('/api/v1/applications/:id/submit', (req, res) => {
  const appItem = applications.find(a => a.id === req.params.id)
  if (!appItem) return res.status(404).json({ detail: 'Application not found' })
  appItem.status = 'SUBMITTED'
  appItem.current_stage = 'AUTOMATED_CHECK'
  appItem.updated_at = new Date().toISOString()

  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    actor_id: 'u-applicant',
    actor_role: 'applicant',
    action: 'APPLICATION_SUBMITTED',
    entity: 'application',
    entity_id: appItem.id,
    created_at: new Date().toISOString()
  })

  notifications.unshift({
    id: `notif-${Date.now()}`,
    user_id: 'u-applicant',
    type: 'success',
    title: 'Application Submitted',
    message: `Your application ${appItem.id.slice(0, 8)} has been submitted.`,
    created_at: new Date().toISOString()
  })

  res.json({ message: 'Application submitted successfully', status: appItem.status })
})

app.post('/api/v1/applications/:id/evaluate', (req, res) => {
  const appItem = applications.find(a => a.id === req.params.id)
  if (!appItem) return res.status(404).json({ detail: 'Application not found' })

  const income = Number(appItem.data?.annual_family_income || 240000)
  const isIncomePass = income <= 500000
  const isCategoryPass = (appItem.data?.category || 'ST') === 'ST'

  appItem.eligibility_result = {
    overall: isIncomePass && isCategoryPass ? 'PASS' : 'FAIL',
    rules_evaluated: [
      { field: 'category', rule: 'Must be ST', actual: appItem.data?.category || 'ST', status: isCategoryPass ? 'PASS' : 'FAIL', note: 'Category verified' },
      { field: 'annual_family_income', rule: '≤ ₹5,00,000', actual: `₹${income.toLocaleString('en-IN')}`, status: isIncomePass ? 'PASS' : 'FAIL', note: 'Income check evaluated' },
      { field: 'course', rule: 'PhD or MPhil', actual: appItem.data?.course || 'PhD', status: 'PASS', note: 'Qualifying program' },
      { field: 'marks_percentage', rule: '≥ 55%', actual: `${appItem.data?.marks_percentage || 78.5}%`, status: 'PASS', note: 'Academics standard met' }
    ]
  }

  appItem.merit_score = 82.5
  appItem.verification_priority = {
    score: 48,
    level: 'Medium',
    reasons: ['Consistent income documentation', 'Name similarity 92% across certificates']
  }
  appItem.updated_at = new Date().toISOString()

  res.json({
    eligibility: appItem.eligibility_result,
    merit_score: appItem.merit_score,
    verification_priority: appItem.verification_priority
  })
})

app.post('/api/v1/applications/:id/transition', (req, res) => {
  const appItem = applications.find(a => a.id === req.params.id)
  if (!appItem) return res.status(404).json({ detail: 'Application not found' })
  const { to_status, reason } = req.body
  appItem.status = to_status || appItem.status
  appItem.updated_at = new Date().toISOString()

  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    actor_id: 'u-officer',
    actor_role: 'district_officer',
    action: `STATUS_CHANGED_${to_status}`,
    entity: 'application',
    entity_id: appItem.id,
    created_at: new Date().toISOString()
  })

  res.json({ status: appItem.status, message: `Transitioned to ${to_status}` })
})

// -------------------------------------------------------------
// Documents Routes (/api/v1/documents)
// -------------------------------------------------------------
app.get('/api/v1/applications/:id/documents', (req, res) => {
  const appDocs = documents.filter(d => d.application_id === req.params.id)
  res.json({ items: appDocs })
})

app.post('/api/v1/applications/:id/documents', upload.single('file') as any, (req, res) => {
  const file = req.file
  const docKey = req.body.document_key || 'st_certificate'
  const newDoc = {
    id: `doc-${Date.now()}`,
    application_id: req.params.id,
    document_key: docKey,
    document_name: docKey.replace(/_/g, ' ').toUpperCase(),
    file_name: file ? file.originalname : `${docKey}.pdf`,
    file_url: '/samples/authentic_st_certificate.jpg',
    status: 'UPLOADED',
    verification_status: 'PENDING',
    ocr_status: 'COMPLETED',
    extracted_data: {
      name: 'Laxmi Hembram',
      issue_date: '2023-01-15',
      authority: 'Revenue Officer'
    },
    quality_score: 90,
    forensic: {
      level: 'Low',
      score: 15,
      verdict: 'Document upload received and screened',
      recommendation: 'Visual features acceptable for scrutiny',
      disclaimer: 'Advisory analysis.',
      model: 'DocForensic-v2.1',
      evidence: ['High clarity', 'No anomalous compression edges'],
      factors: [
        { name: 'Resolution', value: 'High', status: 'PASS', detail: 'Document text readily legible' }
      ]
    },
    created_at: new Date().toISOString()
  }
  documents.push(newDoc)
  res.json(newDoc)
})

app.get('/api/v1/documents/:id', (req, res) => {
  const doc = documents.find(d => d.id === req.params.id)
  if (!doc) return res.status(404).json({ detail: 'Document not found' })
  res.json(doc)
})

app.post('/api/v1/documents/:id/verify', (req, res) => {
  const doc = documents.find(d => d.id === req.params.id)
  if (!doc) return res.status(404).json({ detail: 'Document not found' })
  doc.status = 'VERIFIED'
  doc.verification_status = 'VERIFIED'
  res.json({ message: 'Document verified', document: doc })
})

app.post('/api/v1/documents/:id/correct', (req, res) => {
  const doc = documents.find(d => d.id === req.params.id)
  if (!doc) return res.status(404).json({ detail: 'Document not found' })
  doc.extracted_data = { ...doc.extracted_data, ...req.body }
  res.json({ message: 'Extracted fields updated', document: doc })
})

app.post('/api/v1/documents/scan', upload.single('file') as any, (req, res) => {
  res.json({
    document_key: req.body.document_key || 'st_certificate',
    quality: { score: 92, level: 'Good', is_blurry: false, is_cropped: false },
    classification: { predicted_type: req.body.document_key || 'st_certificate', confidence: 0.94 },
    forensic: {
      level: 'Low',
      score: 18,
      verdict: 'Clear scanned certificate',
      recommendation: 'Eligible for officer scrutiny',
      disclaimer: 'Advisory check only.',
      model: 'DocForensic-v2.1',
      evidence: ['No secondary recompression artifacts detected', 'Consistent sensor noise signature'],
      factors: [
        { name: 'ELA Recompression', value: '3.8%', status: 'PASS', detail: 'Single JPEG pass' },
        { name: 'Blur Consistency', value: 'Uniform', status: 'PASS', detail: 'Natural depth variance' }
      ]
    }
  })
})

// -------------------------------------------------------------
// Officer Routes (/api/v1/officer)
// -------------------------------------------------------------
app.get('/api/v1/officer/queue', (req, res) => {
  const { status, verification_priority } = req.query
  let list = [...applications]
  if (status) list = list.filter(a => a.status === status)
  if (verification_priority) list = list.filter(a => a.verification_priority?.level === verification_priority)
  res.json({ items: list, total: list.length })
})

app.get('/api/v1/officer/applications/:id', (req, res) => {
  const appItem = applications.find(a => a.id === req.params.id)
  if (!appItem) return res.status(404).json({ detail: 'Application not found' })
  const scheme = schemes.find(s => s.id === appItem.scheme_id) || schemes[0]
  const appDocs = documents.filter(d => d.application_id === appItem.id)

  res.json({
    application: appItem,
    applicant: applicantProfile,
    scheme,
    documents: appDocs,
    ai_evidence: {
      eligibility: appItem.eligibility_result,
      verification_priority: appItem.verification_priority,
      merit_score: appItem.merit_score,
      fuzzy_match: {
        score: 0.92,
        details: 'Phonetic match between Laxmi Hembram (record) and Laxmi Hembrom (marksheet) — standard dialectal spelling.'
      },
      duplicate_check: {
        duplicate_detected: false,
        similarity_to_prior_approved: 0.04
      }
    }
  })
})

app.post('/api/v1/officer/applications/:id/decision', (req, res) => {
  const appItem = applications.find(a => a.id === req.params.id)
  if (!appItem) return res.status(404).json({ detail: 'Application not found' })
  const { decision, reason, deficiency_details } = req.body

  if (decision === 'VERIFY' || decision === 'VERIFIED') {
    appItem.status = 'COMMITTEE_REVIEW'
  } else if (decision === 'DEFICIENCY' || decision === 'DEFICIENCY_RAISED') {
    appItem.status = 'DEFICIENCY_RAISED'
  } else if (decision === 'REJECT' || decision === 'REJECTED') {
    appItem.status = 'REJECTED'
  } else if (decision === 'SANCTION' || decision === 'SANCTIONED') {
    appItem.status = 'SANCTIONED'
  } else if (decision === 'PAYMENT' || decision === 'PAYMENT_RELEASED') {
    appItem.status = 'PAYMENT_RELEASED'
  }

  appItem.updated_at = new Date().toISOString()

  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    actor_id: 'u-officer',
    actor_role: 'district_officer',
    action: `OFFICER_DECISION_${decision}`,
    entity: 'application',
    entity_id: appItem.id,
    notes: reason || deficiency_details || '',
    created_at: new Date().toISOString()
  })

  notifications.unshift({
    id: `notif-${Date.now()}`,
    user_id: 'u-applicant',
    type: decision.includes('DEFICIENCY') ? 'warning' : 'info',
    title: `Decision on Application: ${decision}`,
    message: reason || `Application updated by officer: ${decision}`,
    created_at: new Date().toISOString()
  })

  res.json({ message: 'Officer decision recorded', status: appItem.status })
})

app.get('/api/v1/officer/dashboard/stats', (req, res) => {
  res.json({
    total_in_queue: applications.length,
    under_scrutiny: applications.filter(a => a.status === 'OFFICER_SCRUTINY').length,
    verified_count: applications.filter(a => ['COMMITTEE_REVIEW', 'SELECTED', 'SANCTIONED'].includes(a.status)).length,
    deficiency_count: applications.filter(a => a.status === 'DEFICIENCY_RAISED').length,
    rejected_count: applications.filter(a => a.status === 'REJECTED').length,
    avg_turnaround_days: 2.4
  })
})

// -------------------------------------------------------------
// Committee Routes (/api/v1/committee)
// -------------------------------------------------------------
app.get('/api/v1/committee/candidates', (req, res) => {
  res.json({
    candidates: applications.map(a => ({
      ...a,
      applicant_name: a.applicant_name,
      merit_score: a.merit_score || 82.5,
      quota_category: 'ST',
      committee_decision: a.status === 'SELECTED' ? 'SELECTED' : 'PENDING'
    }))
  })
})

app.post('/api/v1/committee/decision', (req, res) => {
  const { decisions } = req.body
  if (Array.isArray(decisions)) {
    decisions.forEach(d => {
      const appItem = applications.find(a => a.id === d.application_id)
      if (appItem) {
        appItem.status = d.decision
        appItem.updated_at = new Date().toISOString()
      }
    })
  }
  res.json({ message: 'Committee decisions registered successfully' })
})

app.get('/api/v1/committee/selection-lists', (req, res) => {
  res.json({
    selection_lists: [
      {
        id: 'list-1',
        scheme_name: 'National Fellowship for ST Students — Demo',
        published_at: new Date().toISOString(),
        total_selected: applications.filter(a => a.status === 'SELECTED').length || 1,
        total_waitlisted: applications.filter(a => a.status === 'WAITLISTED').length || 0
      }
    ]
  })
})

// -------------------------------------------------------------
// Admin Routes (/api/v1/admin)
// -------------------------------------------------------------
app.get('/api/v1/admin/dashboard', (req, res) => {
  const by_status = [
    { status: 'DRAFT', count: applications.filter(a => a.status === 'DRAFT').length },
    { status: 'SUBMITTED', count: applications.filter(a => a.status === 'SUBMITTED').length },
    { status: 'OFFICER_SCRUTINY', count: applications.filter(a => a.status === 'OFFICER_SCRUTINY').length },
    { status: 'COMMITTEE_REVIEW', count: applications.filter(a => a.status === 'COMMITTEE_REVIEW').length },
    { status: 'SELECTED', count: applications.filter(a => a.status === 'SELECTED').length },
    { status: 'DEFICIENCY_RAISED', count: applications.filter(a => a.status === 'DEFICIENCY_RAISED').length }
  ]

  res.json({
    total_applications: applications.length,
    total_schemes: schemes.length,
    by_status,
    by_district: [
      { district: 'Ranchi', count: 1 },
      { district: 'Dhanbad', count: 0 },
      { district: 'West Singhbhum', count: 0 }
    ],
    by_scheme: [
      { scheme: schemes[0]?.name || 'Demo Scheme', count: applications.length }
    ],
    verification_priority_distribution: {
      Low: applications.filter(a => a.verification_priority?.level === 'Low').length,
      Medium: applications.filter(a => a.verification_priority?.level === 'Medium').length,
      High: applications.filter(a => a.verification_priority?.level === 'High').length
    },
    avg_processing_time_days: 2.8,
    deficiency_rate: 12.5,
    selection_count: applications.filter(a => a.status === 'SELECTED').length,
    waitlist_count: applications.filter(a => a.status === 'WAITLISTED').length
  })
})

app.get('/api/v1/admin/audit', (req, res) => {
  res.json({
    items: auditLogs,
    total: auditLogs.length,
    page: 1,
    page_size: 50
  })
})

app.get('/api/v1/admin/analytics', (req, res) => {
  res.json({
    monthly_trend: [
      { month: 'Apr', applications: 24, sanctions: 18 },
      { month: 'May', applications: 45, sanctions: 38 },
      { month: 'Jun', applications: 78, sanctions: 65 },
      { month: 'Jul', applications: 110, sanctions: 92 },
      { month: 'Aug', applications: 145, sanctions: 120 },
      { month: 'Sep', applications: 168, sanctions: 142 }
    ],
    district_distribution: [
      { district: 'Ranchi', count: 52 },
      { district: 'West Singhbhum', count: 38 },
      { district: 'Dumka', count: 29 },
      { district: 'Gumla', count: 25 },
      { district: 'Khunti', count: 24 }
    ],
    gender_distribution: [
      { gender: 'Female', count: 88, percentage: 52.4 },
      { gender: 'Male', count: 76, percentage: 45.2 },
      { gender: 'Other', count: 4, percentage: 2.4 }
    ],
    funnel: [
      { stage: 'Draft Started', count: 210 },
      { stage: 'Submitted', count: 168 },
      { stage: 'Officer Verified', count: 148 },
      { stage: 'Committee Selected', count: 120 },
      { stage: 'DBT Sanctioned', count: 115 }
    ]
  })
})

app.get('/api/v1/admin/fairness', (req, res) => {
  res.json({
    fairness_metrics: {
      overall_disparate_impact_ratio: 0.94,
      status: 'FAIR',
      parity_threshold: 0.80,
      summary: 'No adverse demographic impact detected. Approval rates across tribal sub-groups and gender fall within fair selection guidelines.'
    },
    gender_breakdown: [
      { group: 'Female', applicants: 88, selected: 64, rate: 0.727 },
      { group: 'Male', applicants: 76, selected: 54, rate: 0.710 }
    ],
    pvtg_breakdown: [
      { group: 'PVTG (Particularly Vulnerable Tribal Groups)', applicants: 32, selected: 26, rate: 0.812 },
      { group: 'Other ST Communities', applicants: 132, selected: 92, rate: 0.697 }
    ],
    district_spread: [
      { district: 'Ranchi', rate: 0.73 },
      { district: 'West Singhbhum', rate: 0.71 },
      { district: 'Dumka', rate: 0.70 }
    ]
  })
})

app.get('/api/v1/admin/simulator', (req, res) => {
  res.json({
    active_schemes: schemes.map(s => ({ id: s.id, name: s.name, seats: s.seats })),
    simulation_presets: [
      { name: 'Standard 2024 Intake', target_seats: 100, budget_limit: 5000000 },
      { name: 'Expanded PVTG Inclusion', target_seats: 150, budget_limit: 7500000 }
    ]
  })
})

app.get('/api/v1/admin/users', (req, res) => {
  res.json({
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      roles: u.roles,
      phone: u.phone,
      is_active: true
    }))
  })
})

app.get('/api/v1/admin/notifications', (req, res) => {
  res.json({ items: notifications })
})

// -------------------------------------------------------------
// Appeals & Grievances Routes (/api/v1/appeals, /api/v1/grievances)
// -------------------------------------------------------------
app.get('/api/v1/appeals', (req, res) => {
  res.json({ items: appeals })
})

app.post('/api/v1/appeals', (req, res) => {
  const newAppeal = {
    id: `app-appeal-${Date.now()}`,
    application_id: req.body.application_id,
    reason: req.body.reason,
    status: 'SUBMITTED',
    created_at: new Date().toISOString()
  }
  appeals.unshift(newAppeal)
  res.json(newAppeal)
})

app.put('/api/v1/appeals/:id', (req, res) => {
  const item = appeals.find(a => a.id === req.params.id)
  if (!item) return res.status(404).json({ detail: 'Appeal not found' })
  item.status = req.body.status || 'RESOLVED'
  item.resolution_note = req.body.resolution_note || ''
  res.json(item)
})

app.get('/api/v1/grievances', (req, res) => {
  res.json({ items: grievances })
})

app.post('/api/v1/grievances', (req, res) => {
  const newGrievance = {
    id: `grv-${Date.now()}`,
    subject: req.body.subject,
    description: req.body.description,
    status: 'OPEN',
    created_at: new Date().toISOString()
  }
  grievances.unshift(newGrievance)
  res.json(newGrievance)
})

// -------------------------------------------------------------
// Chatbot Routes (/api/v1/chatbot)
// -------------------------------------------------------------
app.post('/api/v1/chatbot/chat', (req, res) => {
  const { message, lang } = req.body
  const q = (message || '').toLowerCase()
  const isHindi = lang === 'hi' || /[\u0900-\u097F]/.test(message || '')

  let reply = ''
  let quick_replies = isHindi ? ['पात्रता क्या है?', 'आवश्यक दस्तावेज', 'आवेदन कैसे करें?'] : ['Check eligibility', 'Required documents', 'How to apply']

  if (q.includes('eligib') || q.includes('पात्र')) {
    reply = isHindi
      ? 'एसटी (ST) छात्रवृत्ति के लिए सामान्य नियम: आवेदक अनुसूचित जनजाति (ST) वर्ग से होना चाहिए, वार्षिक पारिवारिक आय ₹5,00,000 या ₹8,00,000 से कम होनी चाहिए (योजना अनुसार), और मान्यता प्राप्त संस्थान में प्रवेश होना चाहिए। यह केवल प्राथमिक मार्गदर्शन है, अंतिम निर्णय अधिकारी द्वारा दस्तावेजों के सत्यापन पर निर्भर करता है।'
      : 'For ST Scholarship schemes: Applicants must belong to the Scheduled Tribe (ST) category, have an annual family income within the scheme limit (e.g. ₹5,00,000 for National Fellowship, ₹8,00,000 for Top Class Education), and be enrolled in an eligible program. This is advisory guidance; official approval is determined by nodal officers upon document verification.'
  } else if (q.includes('document') || q.includes('दस्तावेज')) {
    reply = isHindi
      ? 'आवश्यक दस्तावेज: 1) सक्षम प्राधिकारी द्वारा जारी एसटी जाति प्रमाण पत्र, 2) चालू वित्त वर्ष का आय प्रमाण पत्र, 3) पिछली डिग्री की मार्कशीट, 4) कॉलेज/विश्वविद्यालय प्रवेश पत्र या पहचान पत्र।'
      : 'Mandatory documents typically required: 1) ST Community/Caste Certificate issued by competent revenue authority, 2) Current fiscal year Family Income Certificate, 3) Qualifying marksheet/transcripts, 4) Admission letter or institution ID.'
  } else if (q.includes('appeal') || q.includes('अपील') || q.includes('deficiency') || q.includes('त्रुटि')) {
    reply = isHindi
      ? 'यदि आपके आवेदन में कोई कमी (Deficiency) पाई जाती है, तो आप अपने आवेदक डैशबोर्ड पर जाकर सुधार कर सकते हैं या कारण स्पष्ट करते हुए अपील दर्ज कर सकते हैं।'
      : 'If an officer marks a deficiency on your application, you can re-upload corrected documents through your applicant dashboard or submit a formal appeal detailing your case for review.'
  } else {
    reply = isHindi
      ? 'नमस्ते! मैं जनजातीय छात्रवृत्ति सहायक (Sahayak) हूँ। आप मुझसे योजनाओं की पात्रता, आवश्यक दस्तावेज, आवेदन प्रक्रिया और अपील के बारे में पूछ सकते हैं।'
      : 'Hello! I am Sahayak, your ST Scholarship guidance assistant. You can ask me about scheme eligibility criteria, document requirements, dynamic fields, priority scores, or appeal workflows.'
  }

  res.json({
    reply,
    quick_replies,
    disclaimer: 'Sahayak AI is an informational assistant. Official entitlement is decided solely by designated officers.'
  })
})

app.get('/api/v1/chatbot/suggested', (req, res) => {
  res.json({
    questions: [
      'Am I eligible for ST PhD fellowship with 2.4L income?',
      'What documents do I need for Top Class Education Scheme?',
      'What if my surname is spelled slightly differently on my marksheet?',
      'How does the verification priority score work?'
    ]
  })
})

// -------------------------------------------------------------
// ML Services Routes (/api/v1/ml)
// -------------------------------------------------------------
app.post('/api/v1/ml/photo-scan', upload.single('file') as any, (req, res) => {
  const filename = (req.file?.originalname || '').toLowerCase()
  const docHint = req.body.doc_type_hint || 'st_certificate'

  let score = 15
  let level = 'Low'
  let verdict = 'Clean, authentic document structure'
  let recommendation = 'Document passes advisory screening; proceed to standard official verification'
  let evidence = [
    'Uniform Laplacian blur variance across text regions',
    'Single JPEG compression cycle without localized block discontinuities',
    'Standard revenue department typography and seal structure'
  ]

  if (filename.includes('photoshop') || filename.includes('fake_edited') || filename.includes('edited')) {
    score = 49
    level = 'Medium'
    verdict = 'Secondary compression boundary and text block editing detected'
    recommendation = 'Recommend manual review by nodal officer; inspect certificate number directly in issuing portal'
    evidence = [
      'ELA recompression hotspot detected in applicant name field',
      'EXIF metadata indicates image passed through Adobe Photoshop',
      'Discontinuous edge gradient in certificate issue date region'
    ]
  } else if (filename.includes('screenshot') || filename.includes('lowres') || filename.includes('fake_screenshot')) {
    score = 62
    level = 'High'
    verdict = 'Screenshot low-resolution capture with sensor noise mismatch'
    recommendation = 'Recapture advised: Request applicant upload high-resolution flat scan with all four corners visible'
    evidence = [
      'Screen grid moiré pattern identified in background channel',
      'Effective resolution under 150 DPI for text OCR reliability',
      'Sensor noise variance indicates non-camera composite capture'
    ]
  }

  res.json({
    document_key: docHint,
    quality: {
      score: score > 50 ? 68 : 94,
      level: score > 50 ? 'Suboptimal' : 'High',
      is_blurry: score > 50,
      is_cropped: false
    },
    classification: {
      predicted_type: docHint,
      confidence: 0.96
    },
    forensic: {
      score,
      level,
      verdict,
      recommendation,
      disclaimer: 'This check is advisory only. A photograph cannot prove authentic issuance; final finding is confirmed with the issuing authority or signed portal verification.',
      model: 'TribalScholar-Forensic-v2.1',
      evidence,
      factors: [
        { name: 'ELA Recompression', value: score > 40 ? '14.2% (Anomaly)' : '4.1% (Uniform)', status: score > 40 ? 'WARN' : 'PASS', detail: 'Checks re-saved JPEG compression layers' },
        { name: 'Laplacian Blur Map', value: score > 50 ? 'Inconsistent' : 'Consistent', status: score > 50 ? 'WARN' : 'PASS', detail: '3x3 variance across document regions' },
        { name: 'Sensor Noise Spectrum', value: score > 50 ? 'Mixed' : 'Uniform', status: score > 50 ? 'WARN' : 'PASS', detail: 'Sensor noise consistency across quadrants' },
        { name: 'Edge Boundary Gradient', value: score > 40 ? 'Abrupt' : 'Natural', status: score > 40 ? 'WARN' : 'PASS', detail: 'Canny edge detection around key text fields' },
        { name: 'Metadata & Software Flag', value: filename.includes('photoshop') ? 'Editor EXIF' : 'Clean / Scanned', status: filename.includes('photoshop') ? 'FAIL' : 'PASS', detail: 'Inspects EXIF software signatures' }
      ]
    }
  })
})

app.post('/api/v1/ml/eligibility', (req, res) => {
  const { income, income_limit, category, target_category, marks } = req.body
  const incOk = (income || 0) <= (income_limit || 500000)
  const catOk = (category || 'ST') === (target_category || 'ST')
  const marksOk = (marks || 70) >= 55

  res.json({
    eligible: incOk && catOk && marksOk,
    confidence: 0.98,
    reasons: [
      `Income ₹${income} ${incOk ? 'is within limit' : 'exceeds limit'} ₹${income_limit}`,
      `Category ${category} ${catOk ? 'matches' : 'does not match'} required ${target_category}`,
      `Marks ${marks}% ${marksOk ? 'meets' : 'is below'} minimum criteria 55%`
    ],
    model: 'DeterministicEligibilityEngine-v1.0'
  })
})

app.post('/api/v1/ml/document-classify', (req, res) => {
  const text = (req.body.text || '').toLowerCase()
  let docType = 'st_certificate'
  let confidence = 0.95
  if (text.includes('income') || text.includes('आय')) {
    docType = 'income_certificate'
  } else if (text.includes('marksheet') || text.includes('marks') || text.includes('grade')) {
    docType = 'marksheet'
  } else if (text.includes('admission') || text.includes('enrolment')) {
    docType = 'admission_proof'
  }
  res.json({
    predicted_type: docType,
    confidence,
    model: 'DocumentClassifier-v1.2'
  })
})

app.post('/api/v1/ml/verification-priority', (req, res) => {
  const { quality_count = 0, duplicate_score = 0, mismatch = 0 } = req.body
  let score = Math.round(20 + quality_count * 15 + duplicate_score * 30 + mismatch * 25)
  score = Math.min(85, Math.max(10, score))
  const level = score >= 60 ? 'High' : score >= 35 ? 'Medium' : 'Low'

  res.json({
    score,
    level,
    factors: {
      quality_flags: quality_count,
      duplicate_risk: duplicate_score,
      field_mismatch_risk: mismatch
    },
    recommendation: level === 'High' ? 'Prioritize manual scrutiny with primary document verification' : 'Standard review queue'
  })
})

app.post('/api/v1/ml/fairness-audit', (req, res) => {
  res.json({
    demographic_parity: 0.96,
    disparate_impact_ratio: 0.94,
    status: 'FAIR',
    evaluated_at: new Date().toISOString()
  })
})

app.get('/api/v1/ml/models', (req, res) => {
  res.json({
    models: [
      { name: 'Eligibility Rule Engine', version: 'v1.0-deterministic', type: 'Rules/Deterministic', purpose: 'Transparent PASS/FAIL rule evaluation' },
      { name: 'DocForensic Photo Scan', version: 'v2.1', type: 'Advisory CV', purpose: 'ELA, blur consistency, noise analysis' },
      { name: 'Document Classifier', version: 'v1.2', type: 'NLP Classifier', purpose: 'Document category identification' },
      { name: 'Fuzzy Matcher', version: 'v1.4-rapidfuzz', type: 'Phonetic String Metric', purpose: 'Name & dialectal spelling variation review' },
      { name: 'Verification Priority', version: 'v1.0', type: 'Risk Scorer', purpose: 'Officer queue ranking (0-85 cap)' },
      { name: 'Sahayak Chatbot', version: 'v2.0-bilingual', type: 'Intent & FAQ', purpose: 'Hindi/English student advisory' }
    ]
  })
})

// -------------------------------------------------------------
// Vite Dev Server / Static Production Server
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production'

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.join(__dirname, 'dist')
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TribalScholar AI] Server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`)
  })
}

startServer().catch(err => {
  console.error('[TribalScholar AI] Failed to start server:', err)
  process.exit(1)
})
