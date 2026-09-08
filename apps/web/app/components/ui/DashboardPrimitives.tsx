import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export function UiCard({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <article className={`ui-card ${className}`.trim()} {...props} />;
}

export function UiBadge({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'warning' | 'rose'; children: ReactNode }) {
  return <span className={`ui-badge is-${tone}`}>{children}</span>;
}

export function UiAlert({ title, children, tone = 'neutral' }: { title: string; children: ReactNode; tone?: 'neutral' | 'warning' | 'success' }) {
  return <div className={`ui-alert is-${tone}`} role="status"><strong>{title}</strong><span>{children}</span></div>;
}

export function UiButton({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' }) {
  return <button className={`ui-button is-${variant} ${className}`.trim()} {...props} />;
}

export function UiProgress({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return <div className="ui-progress"><div><span>{label}</span><strong>{safeValue}%</strong></div><i><b style={{ width: `${safeValue}%` }} /></i></div>;
}

export function UiTabs({ children, label }: { children: ReactNode; label: string }) {
  return <div className="ui-tabs" role="tablist" aria-label={label}>{children}</div>;
}
