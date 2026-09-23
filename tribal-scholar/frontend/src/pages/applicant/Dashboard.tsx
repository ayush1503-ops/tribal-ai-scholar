import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Card, StatusBadge } from '../../components/Layout'
import { FileText, Clock, AlertCircle, CheckCircle, Award } from 'lucide-react'

export default function ApplicantDashboard() {
  const [apps, setApps] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)

  useEffect(()=>{
    api.get('/applications').then(r=>setApps(r.data.items))
    api.get('/profile').then(r=>setProfile(r.data))
  },[])

  const timeline = (status: string) => {
    const steps = ["DRAFT","SUBMITTED","AUTOMATED_CHECK","INSTITUTE_VERIFICATION","OFFICER_SCRUTINY","COMMITTEE_REVIEW","SELECTED"]
    const idx = steps.indexOf(status)
    return steps.map((s,i)=> ({
      label: s.replace(/_/g,' '),
      done: i <= idx && status !== "DRAFT" || (status==="DRAFT" && i===0),
      current: s===status
    }))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {profile?.applicant?.full_name || profile?.user?.full_name || 'Scholar'}</h1>
          <p className="text-sm text-gray-600">Your applications, status, timelines and actions.</p>
        </div>
        <Link to="/schemes" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">Explore Schemes</Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <Card className="p-5"><div className="text-sm text-gray-500 flex items-center gap-2"><FileText className="w-4 h-4"/> Total Applications</div><div className="text-2xl font-bold mt-1">{apps.length}</div></Card>
        <Card className="p-5"><div className="text-sm text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4"/> Pending Review</div><div className="text-2xl font-bold mt-1">{apps.filter(a=>['SUBMITTED','AUTOMATED_CHECK','OFFICER_SCRUTINY'].includes(a.status)).length}</div></Card>
        <Card className="p-5"><div className="text-sm text-gray-500 flex items-center gap-2"><Award className="w-4 h-4"/> Selected</div><div className="text-2xl font-bold mt-1">{apps.filter(a=>a.status==='SELECTED').length}</div></Card>
      </div>

      <div className="mt-8">
        <h2 className="font-bold text-lg">My Applications</h2>
        {apps.length===0 ? (
          <Card className="p-8 text-center mt-4">
            <div className="text-gray-500">No applications yet.</div>
            <Link to="/schemes" className="mt-3 inline-flex px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Browse schemes</Link>
          </Card>
        ) : (
          <div className="grid gap-4 mt-4">
            {apps.map(app=>(
              <Card key={app.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{app.scheme_name}</div>
                    <div className="text-sm text-gray-500">ID: {app.id.slice(0,8)} • Created {new Date(app.created_at).toLocaleDateString()}</div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                <div className="mt-4">
                  <div className="text-xs font-medium text-gray-600">Progress</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {timeline(app.status).map((t,i)=>(
                      <span key={i} className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 ${t.current ? 'bg-primary-600 text-white border-primary-600' : t.done ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500'}`}>
                        {t.done && !t.current ? <CheckCircle className="w-3 h-3" /> : t.current ? <Clock className="w-3 h-3" /> : null}
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>

                {app.verification_priority && (
                  <div className="mt-3 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Verification Priority: <b>{app.verification_priority.score}/100 — {app.verification_priority.level}</b> • {app.verification_priority.recommendation}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/applicant/apply/${app.id}`} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">Open Application</Link>
                  <Link to={`/applicant/timeline/${app.id}`} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">Timeline</Link>
                  {app.status==='DEFICIENCY_RAISED' && <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-lg"><AlertCircle className="w-4 h-4"/> Action required: correct deficiency</span>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <Card className="p-5">
          <h3 className="font-semibold">Profile snapshot</h3>
          {profile?.applicant ? (
            <div className="mt-3 text-sm space-y-1 text-gray-700">
              <div>Name: <b>{profile.applicant.full_name}</b></div>
              <div>Category: {profile.applicant.category} • State: {profile.applicant.state} • District: {profile.applicant.district}</div>
              <div>Course: {profile.applicant.course} • Income: ₹{profile.applicant.annual_family_income?.toLocaleString('en-IN')}</div>
              <Link to="/applicant/profile" className="inline-flex mt-3 text-sm text-primary-600 font-medium hover:underline">Edit profile →</Link>
            </div>
          ) : <div className="text-sm text-gray-500">Loading profile...</div>}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Notifications & Appeals</h3>
          <div className="mt-3 space-y-2 text-sm">
            <Link to="/notifications" className="block border rounded-lg px-3 py-2 hover:bg-gray-50">View notifications</Link>
            <Link to="/applicant/appeals" className="block border rounded-lg px-3 py-2 hover:bg-gray-50">My Appeals</Link>
            <Link to="/applicant/grievances" className="block border rounded-lg px-3 py-2 hover:bg-gray-50">My Grievances</Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
