'use client'

export default function CustomizationInput({ customPrompt, setCustomPrompt }) {
  return (
    <div className="mb-4">
      <textarea
        placeholder={`Optional customization (e.g. tone, company name, purpose of outreach):`}
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        rows={6}
        className="w-full rounded-lg border border-gray-300 p-4 placeholder-gray-400"
      />
      {customPrompt && (
        <p className="text-sm text-gray-500 mt-2">
          Current prompt: <span className="font-mono text-gray-700">{customPrompt.slice(0, 100)}...</span>
        </p>
      )}
    </div>
  )
}

