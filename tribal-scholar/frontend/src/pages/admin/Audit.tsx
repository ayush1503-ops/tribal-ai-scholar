import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { Card } from '../../components/Layout'

export default function Audit() {
  const [logs, setLogs] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  useEffect(()=>{ api.get('/admin/audit', {params: {action: filter || undefined}}).then(r=>setLogs(r.data.items)) },[filter])
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <p className="text-sm text-gray-600">Every important action creates an audit event — not casually editable.</p>
      <Card className="p-4 mt-4">
        <div className="flex gap-2">
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All actions</option>
            <option value="APPLICATION_CREATED">APPLICATION_CREATED</option>
            <option value="APPLICATION_SUBMITTED">APPLICATION_SUBMITTED</option>
            <option value="RULE_EVALUATED">RULE_EVALUATED</option>
            <option value="DOCUMENT_UPLOADED">DOCUMENT_UPLOADED</option>
            <option value="OCR_COMPLETED">OCR_COMPLETED</option>
            <option value="OFFICER_DECISION">OFFICER_DECISION</option>
            <option value="SCHEME_UPDATED">SCHEME_UPDATED</option>
          </select>
          <span className="text-xs text-gray-500 py-2">Fields: actor, role, action, entity, old/new, reason, timestamp, IP/device</span>
        </div>
      </Card>
      <div className="mt-6 space-y-2">
        {logs.map(l=>(
          <Card key={l.id} className="p-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="font-mono bg-gray-50 border px-2 py-1 rounded">{l.action}</span>
              <span className="bg-primary-50 text-primary-700 border border-primary-100 px-2 py-1 rounded">{l.actor_role}</span>
              <span>{l.entity}:{l.entity_id.slice(0,8)}</span>
              <span className="text-gray-500">{new Date(l.created_at).toLocaleString()}</span>
            </div>
            <div className="text-xs mt-2 grid md:grid-cols-2 gap-2">
              <div><span className="font-medium">Old:</span> <code className="bg-gray-50 border px-1 rounded">{JSON.stringify(l.old_value || {}).slice(0,200)}</code></div>
              <div><span className="font-medium">New:</span> <code className="bg-green-50 border px-1 rounded">{JSON.stringify(l.new_value || {}).slice(0,200)}</code></div>
            </div>
            {l.reason && <div className="text-xs text-gray-600 mt-1">Reason: {l.reason}</div>}
          </Card>
        ))}
        {logs.length===0 && <div className="text-center py-8 text-gray-500">No logs.</div>}
      </div>
    </div>
  )
}
