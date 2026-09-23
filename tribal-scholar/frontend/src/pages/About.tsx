import React from 'react'
import { Card } from '../components/Layout'

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">About TribalScholar AI — Prototype</h1>
      <Card className="p-6 mt-6">
        <h2 className="font-semibold">Architecture</h2>
        <p className="text-sm text-gray-600 mt-2">React + Vite + TypeScript + Tailwind • FastAPI + SQLAlchemy + PostgreSQL (SQLite for demo) • PaddleOCR/Tesseract + RapidFuzz • JWT, RBAC, Audit logs.</p>
        <h3 className="font-semibold mt-4">AI Safety</h3>
        <p className="text-sm text-gray-600 mt-1">AI extracts information, checks quality, compares documents, identifies possible duplicates, calculates verification priority, recommends manual review. AI never auto-rejects, never declares fraud, never sanctions/pays. Every AI result has confidence, evidence, timestamp, version.</p>
        <h3 className="font-semibold mt-4">Known Prototype Limitations</h3>
        <ul className="text-sm text-gray-600 list-disc pl-5 mt-1 space-y-1">
          <li>No real Aadhaar/bank/DBT integration — synthetic placeholders</li>
          <li>Mock OCR (real Tesseract if available, else heuristic)</li>
          <li>Local file storage, no object storage</li>
          <li>Mock OTP 123456, in-app notifications only</li>
          <li>SQLite file for ease; Postgres ready via DATABASE_URL</li>
        </ul>
      </Card>
    </div>
  )
}
