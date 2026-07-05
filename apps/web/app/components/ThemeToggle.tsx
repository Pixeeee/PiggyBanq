'use client';

import { useEffect, useState } from 'react';

type ThemeChoice = 'system' | 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>('system');

  useEffect(() => {
    const savedTheme = sanitizeTheme(window.localStorage.getItem('piggybanq-theme'));
    setTheme(savedTheme);
    applyTheme(savedTheme);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (sanitizeTheme(window.localStorage.getItem('piggybanq-theme')) === 'system') {
        applyTheme('system');
      }
    };

    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, []);

  function changeTheme(nextTheme: ThemeChoice) {
    setTheme(nextTheme);
    window.localStorage.setItem('piggybanq-theme', nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <label className="theme-select">
      <span>Theme</span>
      <select value={theme} onChange={(event) => changeTheme(event.target.value as ThemeChoice)} aria-label="Change color theme">
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}

function sanitizeTheme(value: string | null): ThemeChoice {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  root.dataset.theme = theme;

  if (theme === 'system') {
    root.dataset.resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return;
  }

  root.dataset.resolvedTheme = theme;
}
