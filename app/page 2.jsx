'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { BASE_PROMPT } from './config/prompts'
import CustomizationInput from './components/CustomizationInput'
import { saveAs } from 'file-saver'

export default function Home() {
  const [csvData, setCsvData] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [generatedIntro, setGeneratedIntro] = useState([])

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    Papa.parse(file, {
      header: true,
      complete: (results) => setCsvData(results.data),
    })
  }

  const generateIntro = async () => {
    if (!csvData) {
      alert('Please upload a CSV file first.')
      return
    }

    const cleanedData = csvData.filter(row =>
      row.firstName && row.lastName && row.company
    )

    const finalPrompt = customPrompt.trim()
      ? `${BASE_PROMPT}\n\nAdditional context:\n${customPrompt}`
      : BASE_PROMPT

    const response = await fetch('/api/generate-intro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        data: cleanedData,
      }),
    })

    const result = await response.json()
    const lines = result.intro.split(/\n(?=\d+\. )/).filter(Boolean)
    setGeneratedIntro(lines)
  }

  const handleDownload = () => {
    const csv = Papa.unparse(
      csvData.map((row, i) => ({ ...row, intro: generatedIntro[i] || '' }))
    )
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, 'custom_intros.csv')
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🎯 Intro Generator</h1>
      <p className="text-sm mb-2 text-gray-700">
        Please upload a CSV file with the following columns:{' '}
        <strong>firstName, lastName, title, company</strong>
      </p>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="mb-4 block"
      />

      <CustomizationInput
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
      />

      <div className="flex gap-4 mt-4">
        <button
          onClick={generateIntro}
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
        >
          🚀 Generate Intros
        </button>

        <button
          onClick={handleDownload}
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
        >
          📥 Download CSV
        </button>
      </div>

      {generatedIntro.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">✨ Generated Intros</h2>

          {generatedIntro.slice(0, 3).map((text, idx) => (
            <div
              key={idx}
              className="bg-white p-4 my-2 rounded shadow whitespace-pre-wrap"
            >
              {text}
            </div>
          ))}

          {generatedIntro.length > 3 && (
            <p className="mt-4 text-sm text-gray-600">
              The rest of the intros are available in the downloaded CSV file.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

