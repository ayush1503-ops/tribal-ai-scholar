import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../../components/Layout'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('applicant@demo.local')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      // redirect based on role
      const user = JSON.parse(localStorage.getItem('user')||'{}')
      const roles = user.roles || []
      if (roles.includes('super_admin')) nav('/admin/dashboard')
      else if (roles.includes('district_officer') || roles.includes('scheme_officer') || roles.includes('institute_verifier')) nav('/officer/dashboard')
      else if (roles.includes('selection_committee')) nav('/committee/dashboard')
      else nav('/applicant/dashboard')
    } catch (err:any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally { setLoading(false)}
  }

  return (
    <div className="min-h-screen bg-gov-bg flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-600 text-white rounded-xl flex items-center justify-center mx-auto font-bold text-xl">T</div>
          <h1 className="text-xl font-bold mt-3">Login to TribalScholar AI</h1>
          <p className="text-sm text-gray-500 mt-1">Prototype — use demo accounts</p>
        </div>
        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>}
        <form onSubmit={handle} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none" placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none" placeholder="••••••••" />
          </div>
          <button disabled={loading} className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50">{loading ? 'Signing in...' : 'Login'}</button>
        </form>
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs leading-relaxed">
          <div className="font-semibold">Demo Accounts (password: demo123)</div>
          <div className="mt-1 font-mono">applicant@demo.local<br/>officer@demo.local<br/>admin@demo.local<br/>committee@demo.local</div>
          <div className="mt-2 text-amber-800">Mock OTP: <b>123456</b> labelled as prototype functionality</div>
        </div>
        <p className="text-sm text-center mt-4">No account? <Link to="/register" className="text-primary-600 font-medium hover:underline">Register</Link></p>
      </Card>
    </div>
  )
}
