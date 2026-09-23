import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../../components/Layout'

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({email:'', password:'demo123', full_name:'', phone:'', role:'applicant'})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      nav('/applicant/dashboard')
    } catch (err:any) { setError(err.response?.data?.detail || 'Registration failed') } finally { setLoading(false)}
  }

  return (
    <div className="min-h-screen bg-gov-bg flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg p-8">
        <h1 className="text-xl font-bold">Create Account — Prototype</h1>
        <p className="text-sm text-gray-500">Synthetic data only. No real IDs required.</p>
        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <input required value={form.full_name} onChange={e=>setForm({...form, full_name:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Enter name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input required type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="10-digit" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Password</label>
              <input required type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Role (demo)</label>
              <select value={form.role} onChange={e=>setForm({...form, role:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                <option value="applicant">Applicant</option>
                <option value="institute_verifier">Institute Verifier</option>
                <option value="district_officer">Officer</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          <button disabled={loading} className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700">{loading?'Creating...':'Create Account'}</button>
        </form>
        <p className="text-sm text-center mt-4">Already have account? <Link to="/login" className="text-primary-600 font-medium">Login</Link></p>
      </Card>
    </div>
  )
}
