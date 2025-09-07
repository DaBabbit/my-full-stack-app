'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function ResetPasswordPage() {
  const { supabase, user } = useAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Wenn User bereits eingeloggt ist, direkt zu Update-Password weiterleiten
  useEffect(() => {
    if (user) {
      window.location.href = '/update-password'
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setError('')

    try {
      // Magic Link für Password Reset - funktioniert sofort
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }


  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="max-w-md w-full space-y-8 p-6">
          <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-8 border border-neutral-700">
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20">
                  <span className="text-3xl">✉️</span>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">E-Mail gesendet!</h2>
              <p className="text-neutral-300 mb-6">
                Bitte überprüfen Sie Ihre E-Mail und klicken Sie auf den Link.
              </p>
              <button
                onClick={() => {
                  setSuccess(false)
                  setEmail('')
                }}
                className="w-full py-3 px-4 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-xl font-medium transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                Neuen Link anfordern
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-8 border border-neutral-700">
          <div className="text-center mb-8">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-neutral-800 border border-neutral-600">
                <span className="text-3xl">🔐</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Passwort zurücksetzen</h2>
            <p className="text-neutral-300">
              Geben Sie Ihre E-Mail-Adresse ein, um einen Reset-Link zu erhalten
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
                E-Mail-Adresse
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 hover:bg-neutral-700 hover:border-neutral-600 transition-all duration-300"
                placeholder="ihre.email@beispiel.de"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-3 px-4 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-xl font-medium transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:hover:bg-neutral-800 disabled:hover:text-white disabled:hover:border-neutral-700"
            >
              {isLoading ? 'Wird gesendet...' : 'Reset-Link senden'}
            </button>
          </form>

          {error && (
            <div className="mt-6 bg-red-900/20 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl backdrop-blur-sm">
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 