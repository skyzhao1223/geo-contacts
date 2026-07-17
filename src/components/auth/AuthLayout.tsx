import type { ReactNode } from 'react'

interface AuthLayoutProps {
  heroTitle: string
  heroDescription: string
  features: Array<{ icon: ReactNode; text: string }>
  panelTitle: string
  panelDescription: string
  children: ReactNode
  footer: ReactNode
}

export function AuthLayout({
  heroTitle,
  heroDescription,
  features,
  panelTitle,
  panelDescription,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-hero">
          <div className="auth-brand">
            <div className="brand-mark">G</div>
            <div className="brand-name">{heroTitle}</div>
          </div>
          <p className="auth-hero-lead">{heroDescription}</p>
          <div className="auth-features">
            {features.map((feature) => (
              <div key={feature.text} className="auth-feature">
                <span className="auth-feature-icon">{feature.icon}</span>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-panel">
          <h2>{panelTitle}</h2>
          <p>{panelDescription}</p>
          {children}
          {footer}
        </section>
      </div>
    </div>
  )
}
