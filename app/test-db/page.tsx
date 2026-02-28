'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestDB() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, message])
  }

  async function testConnection() {
    setLoading(true)
    setResult('')
    setLogs([])
    addLog('🔍 Starting connection test...')

    try {
      // Test 1: Check connection
      addLog('📡 Test 1: Checking basic connection...')
      const { data: connectionTest, error: connError } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (connError) {
        const errorMsg = `❌ Connection Error: ${connError.message}`
        addLog(errorMsg)
        setResult(errorMsg)
        return
      }

      addLog('✅ Basic connection OK')

      // Test 2: Try to insert a test user
      addLog('📝 Test 2: Attempting to insert test user...')
      const testUser = {
        email: `test_${Date.now()}@test.com`,
        username: `test_${Date.now()}`,
        password_hash: 'test_hash_' + Date.now()
      }

      addLog(`  Email: ${testUser.email}`)
      addLog(`  Username: ${testUser.username}`)

      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert(testUser)
        .select()
        .single()

      if (insertError) {
        const errorDetails = JSON.stringify(insertError, null, 2)
        addLog(`❌ Insert Error: ${insertError.message}`)
        addLog(`📋 Error Details:`)
        addLog(errorDetails)
        setResult(`❌ Insert failed!\n\n${errorDetails}`)
        return
      }

      addLog(`✅ User inserted successfully!`)
      addLog(`   User ID: ${insertData?.id}`)

      // Test 3: Delete test user
      if (insertData) {
        addLog('🗑️ Test 3: Deleting test user...')
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', insertData.id)

        if (deleteError) {
          addLog(`❌ Delete Error: ${deleteError.message}`)
        } else {
          addLog(`✅ User deleted successfully`)
        }
      }

      setResult(`✅ All tests passed!\n\nConnection: ✓ OK\nInsert: ✓ OK\nDelete: ✓ OK`)
    } catch (error: any) {
      const errorMsg = `❌ Exception: ${error.message}\n\n${error.stack}`
      addLog(errorMsg)
      setResult(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔧 Supabase Connection Test</h1>
        
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-6">
          <p className="text-zinc-400 mb-4">
            This page tests your Supabase connection by:
          </p>
          <ul className="text-sm text-zinc-400 space-y-2 mb-6">
            <li>✓ Checking basic database connectivity</li>
            <li>✓ Attempting to insert a test user</li>
            <li>✓ Deleting the test user</li>
          </ul>

          <button
            onClick={testConnection}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {loading ? '⏳ Testing...' : '▶️ Run Test'}
          </button>
        </div>

        {logs.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-zinc-300">📋 Test Logs:</h2>
            <div className="bg-black rounded p-4 text-sm font-mono space-y-1 max-h-60 overflow-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-zinc-300">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className={`${result.includes('✅') ? 'bg-green-900 border-green-600' : 'bg-red-900 border-red-600'} border rounded-lg p-6`}>
            <h2 className="text-lg font-semibold mb-3">📊 Test Result:</h2>
            <pre className="bg-black rounded p-4 text-sm overflow-auto whitespace-pre-wrap break-words">
              {result}
            </pre>
          </div>
        )}

        <div className="mt-8 p-4 bg-zinc-900 rounded-lg text-sm text-zinc-400">
          <p className="font-semibold mb-2">💡 If tests fail:</p>
          <ol className="list-decimal list-inside space-y-2 text-xs">
            <li>Check browser console (F12 &gt; Console) for error details</li>
            <li>Verify Vercel environment variables are set correctly</li>
            <li>Check Supabase RLS policies allow INSERT/SELECT/DELETE</li>
            <li>Verify the users table exists in Supabase</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
