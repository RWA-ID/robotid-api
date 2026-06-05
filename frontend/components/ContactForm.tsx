'use client';

import { useState } from 'react';

// Web3Forms access key. Public by design (it only authorizes posting to the
// inbox bound to this key). Overridable via env for staging/rotations.
const ACCESS_KEY =
  process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? '2ca9de09-d893-47e7-95c3-3aa1c454cf2d';

type Status = 'idle' | 'sending' | 'ok' | 'error';

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus('sending');
    setMessage('Sending…');

    const formData = new FormData(form);
    formData.append('access_key', ACCESS_KEY);
    formData.append('subject', 'New contact via robotid.tech');
    formData.append('from_name', 'Robot ID Tech');

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setStatus('ok');
        setMessage('Thanks — your message is on its way. We’ll reply by email.');
        form.reset();
      } else {
        setStatus('error');
        setMessage(data.message ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again, or reach us on X.');
    }
  };

  return (
    <form className="cform" onSubmit={onSubmit}>
      {/* honeypot — bots fill this, humans never see it */}
      <input type="checkbox" name="botcheck" className="cform-hp" tabIndex={-1} autoComplete="off" />

      <div className="cform-row">
        <label className="cform-field">
          <span className="cform-label">Name</span>
          <input type="text" name="name" required placeholder="Jane Operator" autoComplete="name" />
        </label>
        <label className="cform-field">
          <span className="cform-label">Email</span>
          <input type="email" name="email" required placeholder="you@company.com" autoComplete="email" />
        </label>
      </div>

      <label className="cform-field">
        <span className="cform-label">Company <span className="cform-opt">/ OEM (optional)</span></span>
        <input type="text" name="company" placeholder="Acme Robotics" autoComplete="organization" />
      </label>

      <label className="cform-field">
        <span className="cform-label">Message</span>
        <textarea name="message" required rows={6} placeholder="Fleet size, what you’re building, and how we can help." />
      </label>

      <div className="cform-actions">
        <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </button>
        {message && (
          <span
            className={`cform-status${status === 'ok' ? ' is-ok' : ''}${status === 'error' ? ' is-error' : ''}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
