'use client'
import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { BASE_PROMPT } from './config/prompts'
import CustomizationInput from './components/CustomizationInput'
import { saveAs } from 'file-saver'

export default function Home() {
  const [csvData, setCsvData] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [generatedIntro, setGeneratedIntro] = useState([])
  const [progress, setProgress] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)
  const controllerRef = useRef(null)
  const perPage = 20

  const handleFileUpload = (e) => {
    Papa.parse(e.target.files[0], {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        console.log('Detected headers:', meta.fields)
        // нормализуем: trim + toLowerCase
        const normalized = meta.fields.map((f) => f.trim().toLowerCase())

        // проверяем по ключевым словам, а не точным совпадениям
        const requiredParts = ['first', 'last', 'title', 'company']
        const missingParts = requiredParts.filter(
          (part) => !normalized.some((h) => h.includes(part))
        )

        if (missingParts.length) {
          // для вывода приводим к нужному формату
          const display = missingParts.map((part) => {
            if (part === 'first') return 'firstName'
            if (part === 'last') return 'lastName'
            return part
          })
          alert(`Missing columns: ${display.join(', ')}`)
        } else {
          setCsvData(data)
        }
      },
    })
  }

  const generateIntro = async () => {
    if (!csvData) {
      alert('Upload CSV first')
      return
    }
    setError(null)
    setGeneratedIntro([])
    setProgress(0)
    setIsLoading(true)

    const total = csvData.length
    const results = []

    for (let i = 0; i < total; i++) {
      setStatus(`Generating intro ${i + 1} of ${total}...`)
      const row = csvData[i]
      const prompt = customPrompt.trim()
        ? `${BASE_PROMPT}\n\n${customPrompt}`
        : BASE_PROMPT

      controllerRef.current = new AbortController()
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: (() => {
            const fd = new FormData()
            fd.append('file', new Blob([Papa.unparse([row])]), 'row.csv')
            fd.append('prompt', prompt)
            return fd
          })(),
          signal: controllerRef.current.signal,
        })
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        const text = await res.text()
        results.push(text)
        setProgress(Math.round(((i + 1) / total) * 100))
      } catch (err) {
        setError(err.message || 'Unknown error')
        break
      }
    }

    setIsLoading(false)
    if (!error) {
      setGeneratedIntro(results)
      setPage(1)
      setStatus('Done!')
    }
  }

  const handleRetry = () => generateIntro()
  const handleAbort = () => {
    if (controllerRef.current) controllerRef.current.abort()
    setIsLoading(false)
    setStatus('Aborted')
  }

  const handleDownload = () => {
    const csv = Papa.unparse(generatedIntro.map((intro) => ({ intro })))
    saveAs(new Blob([csv]), 'intros.csv')
  }

  const pageCount = Math.ceil(generatedIntro.length / perPage)
  const current = generatedIntro.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Intro Generator</h1>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={isLoading}
        className="mb-4 block"
      />

      <CustomizationInput
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
        disabled={isLoading}
      />

      <div className="flex gap-4 mt-4">
        <button
          onClick={generateIntro}
          disabled={isLoading || !csvData}
          className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isLoading ? 'Generating…' : '🚀 Generate'}
        </button>
        <button
          onClick={handleDownload}
          disabled={isLoading || generatedIntro.length === 0}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          💾 Download CSV
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          Ошибка: {error}{' '}
          <button onClick={handleRetry} className="underline">
            Retry
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 mt-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-600" />
          <p>{status}</p>
          <button onClick={handleAbort} className="ml-auto text-sm text-gray-500">
            Abort
          </button>
        </div>
      )}

      {!isLoading && progress === 100 && <p className="mt-2 text-green-600">{status}</p>}

      {current.map((text, i) => (
        <div key={i} className="bg-white p-4 my-2 rounded shadow">
          {text}
        </div>
      ))}

      {pageCount > 1 && (
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            ← Prev
          </button>
          <span>
            Page {page} of {pageCount}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

