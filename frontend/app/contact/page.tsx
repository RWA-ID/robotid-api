import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { ContactForm } from '@/components/ContactForm';

export const metadata = { title: 'Contact' };

export default function Contact() {
  return (
    <>
      <main>
        <SiteNav />
        <section className="section">
          <div className="wrap legal-wrap">
            <span className="eyebrow">Get in touch</span>
            <h1 className="sec-h">Talk to Robot&nbsp;ID.</h1>
            <p className="sec-lede">
              Questions about integration, OEM namespaces, fleet onboarding, or pricing?
              Send a note and we’ll get back to you by email. Building something time-sensitive?
              Mention your fleet size and timeline.
            </p>
            <ContactForm />
            <p className="cform-alt">
              Prefer email? Reach us directly at{' '}
              <a href="mailto:contact@robotid.tech">contact@robotid.tech</a>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
