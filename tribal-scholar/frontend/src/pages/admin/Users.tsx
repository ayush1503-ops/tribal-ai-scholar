import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { Card } from '../../components/Layout'

export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  useEffect(()=>{ api.get('/admin/users').then(r=>setUsers(r.data.items)) },[])
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Users & Roles</h1>
      <Card className="p-6 mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b"><tr><th className="text-left py-2">Name</th><th className="text-left py-2">Email</th><th className="text-left py-2">Roles</th><th className="text-left py-2">Active</th></tr></thead>
            <tbody>
              {users.map(u=>(
                <tr key={u.id} className="border-b"><td className="py-2 font-medium">{u.full_name}</td><td className="py-2 font-mono text-xs">{u.email}</td><td className="py-2"><span className="text-xs bg-gray-50 border px-2 py-1 rounded-full">{u.roles.join(', ')}</span></td><td className="py-2">{u.is_active ? 'Yes' : 'No'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
