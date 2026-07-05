'use client';

import { FormEvent, useEffect, useState } from 'react';

type Profile = {
  displayName: string;
  location: string;
  bio: string;
};

type BudgetAllocation = {
  id: string;
  category: string;
  amount: string;
  currency: string;
};

type HelpPost = {
  id: string;
  title: string;
  group: string;
  need: string;
  pledge: string;
  photoDataUrl: string;
  createdAt: string;
};

type Message = {
  id: string;
  scope: 'global' | 'private';
  body: string;
  createdAt: string;
};

const PROFILE_KEY = 'piggybanq.profile';
const BUDGET_KEY = 'piggybanq.budgetAllocations';
const POSTS_KEY = 'piggybanq.helpPosts';
const MESSAGES_KEY = 'piggybanq.messages';

const defaultProfile: Profile = {
  displayName: '',
  location: '',
  bio: ''
};

export function DashboardFeaturePanels() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [budgetAllocations, setBudgetAllocations] = useState<BudgetAllocation[]>([]);
  const [helpPosts, setHelpPosts] = useState<HelpPost[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [photoDataUrl, setPhotoDataUrl] = useState('');

  function jumpToFeature(featureId: string) {
    if (!featureId) {
      return;
    }

    window.location.hash = featureId;
  }

  useEffect(() => {
    setProfile(readStorage(PROFILE_KEY, defaultProfile));
    setBudgetAllocations(readStorage(BUDGET_KEY, []));
    setHelpPosts(readStorage(POSTS_KEY, []));
    setMessages(readStorage(MESSAGES_KEY, []));
  }, []);

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  function addBudgetAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextAllocation = {
      id: crypto.randomUUID(),
      category: String(form.get('category') ?? 'Food'),
      amount: String(form.get('amount') ?? '0'),
      currency: String(form.get('currency') ?? 'PHP')
    };
    const nextAllocations = [nextAllocation, ...budgetAllocations];
    setBudgetAllocations(nextAllocations);
    localStorage.setItem(BUDGET_KEY, JSON.stringify(nextAllocations));
    event.currentTarget.reset();
  }

  function addHelpPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextPost = {
      id: crypto.randomUUID(),
      title: String(form.get('title') ?? ''),
      group: String(form.get('group') ?? 'Calamity Relief'),
      need: String(form.get('need') ?? ''),
      pledge: String(form.get('pledge') ?? '0'),
      photoDataUrl,
      createdAt: new Date().toISOString()
    };
    const nextPosts = [nextPost, ...helpPosts];
    setHelpPosts(nextPosts);
    setPhotoDataUrl('');
    localStorage.setItem(POSTS_KEY, JSON.stringify(nextPosts));
    event.currentTarget.reset();
  }

  function addMessage(scope: 'global' | 'private', body: string) {
    const trimmed = body.trim();

    if (!trimmed) {
      return;
    }

    const nextMessages = [
      {
        id: crypto.randomUUID(),
        scope,
        body: trimmed,
        createdAt: new Date().toISOString()
      },
      ...messages
    ];
    setMessages(nextMessages);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(nextMessages));
  }

  return (
    <section className="dashboard-feature-stack" aria-label="Profile budget and community tools">
      <nav className="feature-tabs" aria-label="Dashboard feature shortcuts">
        <a href="#community">Community</a>
        <a href="#budget">Budget</a>
        <a href="#profile">Profile</a>
      </nav>

      <label className="feature-jump">
        Feature
        <select defaultValue="" onChange={(event) => jumpToFeature(event.currentTarget.value)}>
          <option value="" disabled>
            Open feature
          </option>
          <option value="community">Community</option>
          <option value="budget">Budget allocation</option>
          <option value="profile">Profile</option>
        </select>
      </label>

      <article id="profile" className="dashboard-card feature-panel">
        <div className="dashboard-card-heading">
          <h2>Edit profile</h2>
          <span className="wallet-state">PROFILE</span>
        </div>
        <form className="feature-form" onSubmit={saveProfile}>
          <label>
            Display name
            <input value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
          </label>
          <label>
            Location
            <input value={profile.location} onChange={(event) => setProfile({ ...profile, location: event.target.value })} />
          </label>
          <label>
            Bio
            <textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} />
          </label>
          <button type="submit">Save profile</button>
        </form>
      </article>

      <article id="budget" className="dashboard-card feature-panel">
        <div className="dashboard-card-heading">
          <h2>Budget allocation</h2>
          <span className="wallet-state">BUDGET</span>
        </div>
        <form className="feature-form feature-form-inline" onSubmit={addBudgetAllocation}>
          <label>
            Category
            <select name="category" defaultValue="Food">
              <option>Food</option>
              <option>Water bill</option>
              <option>Electric bill</option>
              <option>Rent</option>
              <option>Emergency savings</option>
            </select>
          </label>
          <label>
            Amount
            <input name="amount" inputMode="decimal" placeholder="0.00" />
          </label>
          <label>
            Currency
            <select name="currency" defaultValue="PHP">
              <option>PHP</option>
              <option>USD</option>
              <option>XLM</option>
              <option>USDC</option>
            </select>
          </label>
          <button type="submit">Add allocation</button>
        </form>
        <DataList
          empty="No budget allocations yet."
          items={budgetAllocations.map((allocation) => `${allocation.category} - ${allocation.currency} ${allocation.amount}`)}
        />
      </article>

      <article id="community" className="dashboard-card feature-panel community-panel">
        <div className="dashboard-card-heading">
          <h2>Social/community layer</h2>
          <span className="wallet-state">RELIEF</span>
        </div>
        <p className="feature-callout">Community is available before profile completion.</p>

        <form className="feature-form" onSubmit={addHelpPost}>
          <label>
            Calamity help post
            <input name="title" placeholder="Family needs drinking water" />
          </label>
          <label>
            Groups
            <select name="group" defaultValue="Calamity Relief">
              <option>Calamity Relief</option>
              <option>Barangay Updates</option>
              <option>Medical Support</option>
              <option>Food and Water</option>
            </select>
          </label>
          <label>
            Discussions
            <textarea name="need" placeholder="Describe what help is needed and where responders should coordinate." />
          </label>
          <label>
            Donation pledge
            <input name="pledge" inputMode="decimal" placeholder="PHP 0.00" />
          </label>
          <label>
            Upload photo
            <input accept="image/png,image/jpeg,image/webp" type="file" onChange={(event) => readPhoto(event.currentTarget.files?.[0], setPhotoDataUrl)} />
          </label>
          {photoDataUrl ? <img className="help-photo-preview" alt="Help post upload preview" src={photoDataUrl} /> : null}
          <button type="submit">Publish help post</button>
        </form>

        <DataList empty="No help posts yet." items={helpPosts.map((post) => `${post.group}: ${post.title} - pledge ${post.pledge}`)} />

        <ChatComposer title="Global chat" scope="global" onSend={addMessage} />
        <ChatComposer title="Private chat" scope="private" onSend={addMessage} />
        <DataList empty="No chat messages yet." items={messages.map((message) => `${message.scope}: ${message.body}`)} />
      </article>
    </section>
  );
}

function ChatComposer({ title, scope, onSend }: { title: string; scope: 'global' | 'private'; onSend: (scope: 'global' | 'private', body: string) => void }) {
  const [body, setBody] = useState('');

  return (
    <form
      className="feature-form chat-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSend(scope, body);
        setBody('');
      }}
    >
      <label>
        {title}
        <input value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Write a ${scope} message`} />
      </label>
      <button type="submit">Send</button>
    </form>
  );
}

function DataList({ empty, items }: { empty: string; items: string[] }) {
  if (items.length === 0) {
    return <p className="feature-empty">{empty}</p>;
  }

  return (
    <ul className="feature-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function readStorage<T>(key: string, fallback: T): T {
  const item = localStorage.getItem(key);

  if (!item) {
    return fallback;
  }

  try {
    return JSON.parse(item) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function readPhoto(file: File | undefined, setPhotoDataUrl: (value: string) => void) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    setPhotoDataUrl('');
    return;
  }

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    if (typeof reader.result === 'string') {
      setPhotoDataUrl(reader.result);
    }
  });
  reader.readAsDataURL(file);
}
