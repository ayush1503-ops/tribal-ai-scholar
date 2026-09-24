import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

type User = { id: string, email: string, full_name: string, roles: string[], phone?: string }
type AuthContextType = {
  user: User | null,
  loading: boolean,
  login: (email: string, password: string) => Promise<void>,
  register: (data: any) => Promise<void>,
  logout: () => void,
  hasRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextType>(null as any)

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      api.get('/auth/me').then(res => {
        const u = { id: res.data.id, email: res.data.email, full_name: res.data.full_name, roles: res.data.roles }
        setUser(u)
        localStorage.setItem('user', JSON.stringify(u))
      }).catch(()=>{})
    }
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/login', {email, password})
      localStorage.setItem('access_token', res.data.access_token)
      localStorage.setItem('refresh_token', res.data.refresh_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      setUser(res.data.user)
    } finally { setLoading(false)}
  }

  const register = async (data: any) => {
    const res = await api.post('/auth/register', data)
    localStorage.setItem('access_token', res.data.access_token)
    localStorage.setItem('refresh_token', res.data.refresh_token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    setUser(res.data.user)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
    window.location.href = '/login'
  }

  const hasRole = (role: string) => !!user?.roles?.includes(role) || !!user?.roles?.includes('super_admin')

  return <AuthContext.Provider value={{user, loading, login, register, logout, hasRole}}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
