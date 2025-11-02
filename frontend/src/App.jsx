import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
// no CSS import here — imported in src/main.jsx

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white shadow-lg rounded-2xl p-8">
        <header className="flex items-center gap-6 mb-6">
          <a href="https://vite.dev" target="_blank" rel="noreferrer" className="inline-flex items-center">
            <img src={viteLogo} className="logo rounded" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank" rel="noreferrer" className="inline-flex items-center">
            <img src={reactLogo} className="logo rounded" alt="React logo" />
          </a>
          <h1 className="text-2xl font-semibold ml-auto">Vite + React</h1>
        </header>

        <main>
          <div className="card bg-gradient-to-r from-sky-50 to-white border border-gray-100 rounded-xl p-6 mb-4 shadow-sm">
            <button
              onClick={() => setCount((c) => c + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:scale-95 transition transform"
              aria-label="Increment counter"
            >
              count is {count}
            </button>

            <p className="mt-4 text-sm text-gray-600">
              Edit <code className="bg-gray-100 px-1 rounded">src/App.jsx</code> and save to test HMR
            </p>
          </div>

          <p className="text-sm text-gray-500">
            Click on the Vite and React logos to learn more
          </p>
        </main>
      </div>
    </div>
  )
}

export default App
