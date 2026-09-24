import axios from 'axios'

// Vercel deployment: API is at same origin under /api/v1
// Local dev: proxied via vite to localhost:8000
// Allow override via VITE_API_BASE env var
const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api/v1'

console.log(`[API] Base URL: ${API_BASE}, Env: ${(import.meta as any).env?.MODE}`)

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    // Don't redirect on 401 for public endpoints
    if (err.response?.status === 401) {
      const publicPaths = ['/', '/schemes', '/about', '/ml-demo', '/photo-scan', '/login', '/register']
      const isPublic = publicPaths.some(p => window.location.pathname === p || window.location.pathname.startsWith('/schemes/'))
      if (!isPublic) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        if (window.location.pathname !== '/login') {
          console.warn('[API] 401 - redirecting to login')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
