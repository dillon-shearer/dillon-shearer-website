'use client'

import { useState } from 'react'
import { submitContactForm } from './actions'

type FormStatus =
  | 'idle'
  | 'sending'
  | 'success'
  | 'error'
  | 'missing'
  | 'invalid-email'
  | 'rate-limit'
  | 'spam'
  | 'forbidden'

export default function ContactForm() {
  const [status, setStatus] = useState<FormStatus>('idle')

  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    
    const form = e.currentTarget
    const formData = new FormData(form)
    const email = formData.get('email') as string
    
    // Validate email format
    if (!isValidEmail(email)) {
      setStatus('invalid-email')
      return
    }
    
    const result = await submitContactForm(formData)
    
    if (result?.success) {
      setStatus('success')
      form.reset()
    } else {
      switch (result?.error) {
        case 'missing':
          setStatus('missing')
          break
        case 'rate-limit':
          setStatus('rate-limit')
          break
        case 'spam':
          setStatus('spam')
          break
        case 'forbidden':
          setStatus('forbidden')
          break
        default:
          setStatus('error')
      }
    }
  }

  return (
    <>
      {/* Success/Error Messages */}
      {status === 'success' && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200">
            ✅ Thanks for your message! I'll get back to you soon.
          </p>
        </div>
      )}
      
      {status === 'missing' && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">
            ❌ Please fill in all required fields.
          </p>
        </div>
      )}

      {status === 'rate-limit' && (
        <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg">
          <p className="text-yellow-900 dark:text-yellow-100">
            ⚠️ You’ve reached the hourly message limit. Please try again later or email me directly.
          </p>
        </div>
      )}

      {status === 'spam' && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">
            ❌ Something felt off about that submission. Please try again or email me directly.
          </p>
        </div>
      )}

      {status === 'forbidden' && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">
            ❌ Please submit the form directly from datawithdillon.com.
          </p>
        </div>
      )}

      {status === 'invalid-email' && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">
            ❌ Please enter a valid email address (e.g., name@example.com).
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">
            ❌ Something went wrong sending your message. Please try again or email me directly at dillon@datawithdillon.com
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="hidden" aria-hidden="true">
          <label htmlFor="company">Company</label>
          <input
            type="text"
            id="company"
            name="company"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="your.email@example.com"
          />
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium mb-2">
            Subject
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="What's this about?"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            placeholder="Your message..."
          />
        </div>

        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {status === 'sending' ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </>
  )
}
