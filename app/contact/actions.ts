'use server'

import { headers } from 'next/headers'

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const submissionBuckets = new Map<string, { count: number; resetAt: number }>()

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false
  const allowed = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    'https://www.datawithdillon.com',
    'http://localhost:3000',
  ].filter(Boolean) as string[]
  return allowed.some(base => origin.startsWith(base))
}

function getClientIp(headerList: Headers): string {
  const forwarded = headerList.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return headerList.get('x-real-ip') ?? 'unknown'
}

function checkRateLimit(ip: string) {
  const now = Date.now()
  const entry = submissionBuckets.get(ip)
  if (entry && entry.resetAt > now) {
    if (entry.count >= RATE_LIMIT_MAX) {
      return false
    }
    entry.count += 1
    submissionBuckets.set(ip, entry)
    return true
  }
  submissionBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  return true
}

export async function submitContactForm(formData: FormData) {
  const headerList = headers()
  const origin = headerList.get('origin')
  const referer = headerList.get('referer')

  const honeypot = formData.get('company') as string | null
  if (honeypot && honeypot.trim().length > 0) {
    return { error: 'spam' }
  }

  if (!isAllowedOrigin(origin) && !isAllowedOrigin(referer)) {
    return { error: 'forbidden' }
  }

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const subject = formData.get('subject') as string
  const message = formData.get('message') as string

  if (!name || !email || !message) {
    return { error: 'missing' }
  }

  const ip = getClientIp(headerList)
  if (!checkRateLimit(ip)) {
    return { error: 'rate-limit' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY missing')
    return { error: 'send' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'contact@datawithdillon.com',
        to: 'dillon@datawithdillon.com',
        subject: subject || `New contact form message from ${name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
          <p><strong>Message:</strong></p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <hr>
          <p><small>Sent from datawithdillon.com contact form</small></p>
        `,
        reply_to: email,
      }),
    })

    if (response.ok) {
      return { success: true }
    } else {
      const errorData = await response.text()
      console.error('Resend API error:', response.status, errorData)
      return { error: 'send' }
    }
  } catch (error) {
    console.error('Email sending failed:', error)
    return { error: 'send' }
  }
}
