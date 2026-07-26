'use client';

import { useEffect, useState } from 'react';

import { getProfile, updateProfile, type AuthUser } from '../../../lib/wallet-auth-api';
import { ThemeToggle } from '../../../components/ThemeToggle';

export function ProfileForm({ user }: { user: AuthUser }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState('');
  const [currency, setCurrency] = useState<'PHP' | 'USD' | 'XLM' | 'USDC'>('PHP');
  const [status, setStatus] = useState('Loading profile...');

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const result = await getProfile();
        if (!isMounted) return;
        setDisplayName(result.profile.displayName);
        setBio(result.profile.bio ?? '');
        if (['PHP', 'USD', 'XLM', 'USDC'].includes(result.profile.currency)) {
          setCurrency(result.profile.currency as typeof currency);
        }
        setStatus('Profile synced.');
      } catch (error) {
        if (!isMounted) return;
        setStatus(error instanceof Error ? error.message : 'Failed to load profile.');
      }
    }

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  async function saveProfile() {
    setStatus('Saving profile...');
    try {
      await updateProfile({
        displayName,
        bio,
        avatarUrl: '',
        coverPhotoUrl: '',
        currency,
        visibility: 'PRIVATE'
      });
      setStatus('Profile saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Profile update failed.');
    }
  }

  return (
    <article className="profile-form-card">
      <div className="profile-avatar">{displayName.slice(0, 1).toUpperCase()}</div>
      <form>
        <label>Profile name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
        <label>Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Short savings note" /></label>
        <label>
          Preferred currency
          <select value={currency} onChange={(event) => setCurrency(event.target.value as typeof currency)}>
            <option value="PHP">PHP</option>
            <option value="USD">USD</option>
            <option value="XLM">XLM</option>
            <option value="USDC">USDC</option>
          </select>
        </label>
        <ThemeToggle />
        <button type="button" onClick={saveProfile}>Save profile</button>
        <p>{status}</p>
      </form>
    </article>
  );
}
