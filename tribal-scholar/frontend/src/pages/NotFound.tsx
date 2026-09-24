import React from 'react'
import { Link } from 'react-router-dom'
export default function NotFound(){ return <div className="max-w-xl mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-bold">404 — Not Found</h1><p className="text-gray-600 mt-2">Page does not exist.</p><Link to="/" className="mt-4 inline-flex px-4 py-2 bg-primary-600 text-white rounded-lg">Home</Link></div>}
