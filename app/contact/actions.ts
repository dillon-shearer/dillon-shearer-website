'use server'

export async function submitContactForm(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const subject = formData.get('subject') as string
  const message = formData.get('message') as string

  // Basic validation
  if (!name || !email || !message) {
    return { error: 'missing' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
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
      console.log('Email sent successfully')
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