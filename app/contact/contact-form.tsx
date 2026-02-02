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
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <p style={{ color: 'rgb(134, 239, 172)' }}>
            ✅ Thanks for your message! I'll get back to you soon.
          </p>
        </div>
      )}

      {status === 'missing' && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p style={{ color: 'rgb(252, 165, 165)' }}>
            ❌ Please fill in all required fields.
          </p>
        </div>
      )}

      {status === 'rate-limit' && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
          <p style={{ color: 'rgb(253, 224, 71)' }}>
            ⚠️ You've reached the hourly message limit. Please try again later or email me directly.
          </p>
        </div>
      )}

      {status === 'spam' && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p style={{ color: 'rgb(252, 165, 165)' }}>
            ❌ Something felt off about that submission. Please try again or email me directly.
          </p>
        </div>
      )}

      {status === 'forbidden' && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p style={{ color: 'rgb(252, 165, 165)' }}>
            ❌ Please submit the form directly from datawithdillon.com.
          </p>
        </div>
      )}

      {status === 'invalid-email' && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p style={{ color: 'rgb(252, 165, 165)' }}>
            ❌ Please enter a valid email address (e.g., name@example.com).
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p style={{ color: 'rgb(252, 165, 165)' }}>
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
          <label htmlFor="name" className="block text-sm font-medium mb-2.5" style={{ color: 'var(--text-primary)' }}>
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="input-base"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2.5" style={{ color: 'var(--text-primary)' }}>
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="input-base"
            placeholder="your.email@example.com"
          />
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium mb-2.5" style={{ color: 'var(--text-primary)' }}>
            Subject
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            className="input-base"
            placeholder="What's this about?"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2.5" style={{ color: 'var(--text-primary)' }}>
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            className="input-base resize-vertical"
            placeholder="Your message..."
          />
        </div>

        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn-primary w-full"
          style={{
            opacity: status === 'sending' ? 0.5 : 1,
            cursor: status === 'sending' ? 'not-allowed' : 'pointer'
          }}
        >
          {status === 'sending' ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </>
  )
}
