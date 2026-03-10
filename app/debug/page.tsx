'use client'

import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [envVars, setEnvVars] = useState({
    urlSet: false,
    keySet: false,
    urlValue: '',
    keyValue: ''
  })

  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    // Check if env vars are available
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('Env vars check:')
    console.log('URL:', url ? '✅ Set' : '❌ Not set')
    console.log('Key:', key ? '✅ Set' : '❌ Not set')

    setEnvVars({
      urlSet: !!url,
      keySet: !!key,
      urlValue: url?.substring(0, 50) + '...' || 'NOT SET',
      keyValue: key ? key.substring(0, 20) + '...' : 'NOT SET'
    })

    // Try to manually test Supabase connection
    const testConnection = async () => {
      try {
        setTestResult('Testing connection...')
        
        if (!url || !key) {
          setTestResult('❌ Credentials not loaded')
          return
        }

        const response = await fetch(`${url}/rest/v1/users?limit=0&count=exact`, {
          method: 'GET',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          }
        })

        console.log('Response status:', response.status)
        console.log('Response headers:', response.headers)

        if (response.ok) {
          const count = response.headers.get('content-range')?.split('/')[1] || '0'
          setTestResult(`✅ Connected! Users in database: ${count}`)
        } else {
          const text = await response.text()
          setTestResult(`❌ Status ${response.status}: ${text}`)
        }
      } catch (error: any) {
        console.error('Connection test error:', error)
        setTestResult(`❌ Error: ${error.message}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔧 Supabase Debug</h1>

      <section style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h2>Environment Variables</h2>
        <p>URL: {envVars.urlSet ? '✅' : '❌'} {envVars.urlValue}</p>
        <p>Key: {envVars.keySet ? '✅' : '❌'} {envVars.keyValue}</p>
      </section>

      <section style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h2>Connection Test</h2>
        <p>{testResult}</p>
      </section>

      <section style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h2>Next Steps</h2>
        <ol>
          <li>If variables show ❌ Not set: Restart dev server (Ctrl+C then npm run dev)</li>
          <li>If connection shows ❌ Status: Check Supabase RLS policies - run the SQL from Step 1</li>
          <li>If connection shows ❌ Error: Check your internet connection</li>
          <li>After fixing, try signup at /auth</li>
        </ol>
      </section>

      <section style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h2>Check Browser Console (F12)</h2>
        <p>Look for "Connection test error" message for details</p>
      </section>
    </div>
  )
}
