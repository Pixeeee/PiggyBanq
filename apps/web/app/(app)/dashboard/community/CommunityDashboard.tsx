'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  type BudgetPlan,
  type ChatMessage,
  type CommunityGroup,
  type CommunitySnapshot,
  type DiscussionPost,
  type ReliefPost,
  type UserProfile,
  createBudgetAllocation,
  createChatMessage,
  createDiscussionPost,
  createReliefPledge,
  createReliefPost,
  getBudgetPlans,
  getCommunity,
  getProfile,
  updateProfile
} from '../../../lib/wallet-auth-api';

const currencies = ['PHP', 'USD', 'XLM', 'USDC'] as const;

type Currency = (typeof currencies)[number];

const emptyProfile: UserProfile = {
  id: '',
  username: null,
  stellarPublicKey: null,
  displayName: '',
  email: null,
  role: 'USER',
  status: 'ACTIVE',
  lastLoginAt: null,
  bio: '',
  avatarUrl: '',
  coverPhotoUrl: '',
  currency: 'PHP',
  visibility: 'PRIVATE'
};

export function CommunityDashboard() {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [community, setCommunity] = useState<CommunitySnapshot | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [status, setStatus] = useState('Loading synced wallet community...');
  const [error, setError] = useState('');
  const [isBusy, setBusy] = useState(false);

  const latestPlan = plans[0];
  const budgetCategories = latestPlan?.categories ?? [];
  const groups = community?.groups ?? [];
  const selectedGroupId = groups[0]?.id ?? '';

  useEffect(() => {
    void refreshDashboardFeatures();
  }, []);

  async function refreshDashboardFeatures() {
    setError('');

    try {
      const [profileResult, budgetResult, communityResult] = await Promise.all([
        getProfile(),
        getBudgetPlans(),
        getCommunity()
      ]);
      setProfile(profileResult.profile);
      setPlans(budgetResult.plans);
      setCommunity(communityResult);
      setStatus('Synced with your Stellar-authenticated session.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load synced community.');
      setStatus('');
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const result = await updateProfile({
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        coverPhotoUrl: profile.coverPhotoUrl,
        currency: profile.currency as Currency,
        visibility: profile.visibility as 'PUBLIC' | 'WALLET_ADDRESS_ONLY' | 'PRIVATE'
      });
      setProfile(result.profile);
      setStatus('Profile synced across wallet sessions.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Profile sync failed.');
    } finally {
      setBusy(false);
    }
  }

  async function addBudgetAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);

    try {
      const result = await createBudgetAllocation({
        category: String(form.get('category') ?? 'Food'),
        amount: String(form.get('amount') ?? '0'),
        currency: String(form.get('currency') ?? 'PHP') as Currency
      });
      setPlans((current) => [result.plan, ...current.filter((plan) => plan.id !== result.plan.id)]);
      setStatus('Budget allocation synced to your wallet profile.');
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Budget sync failed.');
    } finally {
      setBusy(false);
    }
  }

  async function addHelpPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);

    try {
      const result = await createReliefPost({
        description: String(form.get('description') ?? ''),
        locationTag: String(form.get('locationTag') ?? ''),
        targetAmount: String(form.get('targetAmount') ?? '') || undefined,
        assetCode: String(form.get('assetCode') ?? 'PHP') as Currency,
        photoUrl: photoDataUrl
      });
      setCommunity((current) => current ? { ...current, reliefPosts: [result.reliefPost, ...current.reliefPosts] } : current);
      setPhotoDataUrl('');
      setStatus('Help post published to the shared community feed.');
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Help post failed.');
    } finally {
      setBusy(false);
    }
  }

  async function addDiscussionPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);

    try {
      const result = await createDiscussionPost({
        groupId: String(form.get('groupId') ?? selectedGroupId),
        body: String(form.get('body') ?? '')
      });
      setCommunity((current) => current ? { ...current, discussionPosts: [result.discussionPost, ...current.discussionPosts] } : current);
      setStatus('Discussion posted to the selected group.');
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Discussion post failed.');
    } finally {
      setBusy(false);
    }
  }

  async function addMessage(channel: 'GLOBAL' | 'PRIVATE', body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;

    setBusy(true);
    setError('');

    try {
      const result = await createChatMessage({ channel, body: trimmed });
      setCommunity((current) => {
        if (!current) return current;
        const key = channel === 'GLOBAL' ? 'global' : 'private';

        return {
          ...current,
          messages: {
            ...current.messages,
            [key]: [result.message, ...current.messages[key]]
          }
        };
      });
      setStatus(channel === 'GLOBAL' ? 'Global chat synced.' : 'Private chat synced.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Message sync failed.');
    } finally {
      setBusy(false);
    }
  }

  async function addPledge(post: ReliefPost, amount: string) {
    if (!amount.trim()) return;

    setBusy(true);
    setError('');

    try {
      const result = await createReliefPledge(post.id, { amount, assetCode: post.assetCode as Currency });
      setCommunity((current) => current ? {
        ...current,
        reliefPosts: current.reliefPosts.map((item) => item.id === post.id ? result.reliefPost : item)
      } : current);
      setStatus('Donation pledge recorded. No Stellar transaction was signed.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pledge failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dashboard-feature-stack community-workspace" aria-label="Profile budget and synced community tools">
      <div className="community-status-row" role={error ? 'alert' : 'status'}>
        <span>{error || status}</span>
        <button type="button" onClick={refreshDashboardFeatures} disabled={isBusy}>Sync</button>
      </div>

      <aside id="profile" className="dashboard-card feature-panel profile-panel">
        <div className="profile-cover" aria-hidden="true">
          {profile.coverPhotoUrl ? <img src={profile.coverPhotoUrl} alt="" /> : null}
        </div>
        <div className="profile-heading">
          <Avatar user={profile} />
          <div>
            <h2>Edit profile</h2>
            <p>{profile.username ? `@${profile.username}` : 'Wallet user'} · {maskWallet(profile.stellarPublicKey)}</p>
          </div>
        </div>
        <form className="feature-form" onSubmit={saveProfile}>
          <label>
            Display name
            <input value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
          </label>
          <label>
            Bio
            <textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder="Share your savings focus or community role." />
          </label>
          <label>
            Avatar URL
            <input value={profile.avatarUrl} onChange={(event) => setProfile({ ...profile, avatarUrl: event.target.value })} placeholder="https://..." />
          </label>
          <label>
            Cover photo URL
            <input value={profile.coverPhotoUrl} onChange={(event) => setProfile({ ...profile, coverPhotoUrl: event.target.value })} placeholder="https://..." />
          </label>
          <div className="feature-form-inline">
            <label>
              Currency
              <select value={profile.currency} onChange={(event) => setProfile({ ...profile, currency: event.target.value })}>
                {currencies.map((currency) => <option key={currency}>{currency}</option>)}
              </select>
            </label>
            <label>
              Visibility
              <select value={profile.visibility} onChange={(event) => setProfile({ ...profile, visibility: event.target.value })}>
                <option value="PRIVATE">Private</option>
                <option value="WALLET_ADDRESS_ONLY">Wallet masked</option>
                <option value="PUBLIC">Public</option>
              </select>
            </label>
          </div>
          <button type="submit" disabled={isBusy}>Save profile</button>
        </form>
      </aside>

      <article id="community" className="dashboard-card feature-panel community-feed-panel">
        <div className="community-composer-head">
          <Avatar user={community?.viewer ?? profile} />
          <div>
            <h2>Community</h2>
            <p>Shared relief posts, groups, discussions, and chat are tied to your verified Stellar login.</p>
          </div>
        </div>

        <form className="community-composer" onSubmit={addHelpPost}>
          <textarea name="description" placeholder="Post what help is needed, who needs it, and where responders should coordinate." />
          <div className="composer-grid">
            <input name="locationTag" placeholder="Location or barangay" />
            <input name="targetAmount" inputMode="decimal" placeholder="Target amount" />
            <select name="assetCode" defaultValue="PHP">
              {currencies.map((currency) => <option key={currency}>{currency}</option>)}
            </select>
          </div>
          <label className="photo-upload">
            Photo
            <input accept="image/png,image/jpeg,image/webp" type="file" onChange={(event) => readPhoto(event.currentTarget.files?.[0], setPhotoDataUrl)} />
          </label>
          {photoDataUrl ? <img className="help-photo-preview" alt="Help post upload preview" src={photoDataUrl} /> : null}
          <button type="submit" disabled={isBusy}>Publish help post</button>
        </form>

        <Feed posts={community?.reliefPosts ?? []} onPledge={addPledge} />
      </article>

      <aside className="community-side-rail">
        <section id="budget" className="dashboard-card feature-panel">
          <div className="dashboard-card-heading">
            <h2>Budget allocation</h2>
            <span className="wallet-state">SYNCED</span>
          </div>
          <form className="feature-form" onSubmit={addBudgetAllocation}>
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
            <div className="feature-form-inline">
              <label>
                Amount
                <input name="amount" inputMode="decimal" placeholder="0.00" />
              </label>
              <label>
                Currency
                <select name="currency" defaultValue="PHP">
                  {currencies.map((currency) => <option key={currency}>{currency}</option>)}
                </select>
              </label>
            </div>
            <button type="submit" disabled={isBusy}>Add allocation</button>
          </form>
          <BudgetList categories={budgetCategories} />
        </section>

        <section className="dashboard-card feature-panel groups-panel">
          <div className="dashboard-card-heading">
            <h2>Groups</h2>
            <span className="wallet-state">{groups.length}</span>
          </div>
          <GroupList groups={groups} />
          <form className="feature-form" onSubmit={addDiscussionPost}>
            <label>
              Post to group
              <select name="groupId" defaultValue={selectedGroupId}>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
            <textarea name="body" placeholder="Start a discussion with the group." />
            <button type="submit" disabled={isBusy || !selectedGroupId}>Post discussion</button>
          </form>
          <DiscussionList posts={community?.discussionPosts ?? []} />
        </section>

        <section className="dashboard-card feature-panel chat-panel">
          <div className="dashboard-card-heading">
            <h2>Chats</h2>
            <span className="wallet-state">LIVE</span>
          </div>
          <ChatComposer title="Global chat" channel="GLOBAL" messages={community?.messages.global ?? []} onSend={addMessage} />
          <ChatComposer title="Private chat" channel="PRIVATE" messages={community?.messages.private ?? []} onSend={addMessage} />
        </section>
      </aside>
    </section>
  );
}

function Feed({ posts, onPledge }: { posts: ReliefPost[]; onPledge: (post: ReliefPost, amount: string) => void }) {
  if (posts.length === 0) {
    return <p className="feature-empty">No community help posts yet. Published posts appear for every logged-in wallet user.</p>;
  }

  return (
    <div className="community-feed">
      {posts.map((post) => <ReliefFeedCard key={post.id} post={post} onPledge={onPledge} />)}
    </div>
  );
}

function ReliefFeedCard({ post, onPledge }: { post: ReliefPost; onPledge: (post: ReliefPost, amount: string) => void }) {
  const [amount, setAmount] = useState('');
  const pledgeTotal = minorToDisplay(post.pledgeTotalMinor, post.assetCode);
  const target = minorToDisplay(post.targetAmountMinor, post.assetCode);

  return (
    <article className="community-post-card">
      <header>
        <Avatar user={post.author} />
        <div>
          <strong>{post.author.displayName}</strong>
          <span>{post.author.wallet} · {relativeTime(post.createdAt)}</span>
        </div>
      </header>
      <p>{post.description}</p>
      {post.locationTag ? <span className="community-location">{post.locationTag}</span> : null}
      {post.photoUrl ? <img className="community-post-photo" src={post.photoUrl} alt="Community help post" /> : null}
      <div className="pledge-meter">
        <span>{pledgeTotal} pledged</span>
        <span>{target === `${post.assetCode} 0.00` ? 'Open target' : `${target} target`}</span>
      </div>
      <form
        className="pledge-form"
        onSubmit={(event) => {
          event.preventDefault();
          onPledge(post, amount);
          setAmount('');
        }}
      >
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder={`Pledge ${post.assetCode}`} />
        <button type="submit">Pledge</button>
      </form>
      <small>{post.pledgeCount} donation pledge{post.pledgeCount === 1 ? '' : 's'} · no auto-send</small>
    </article>
  );
}

function BudgetList({ categories }: { categories: BudgetPlan['categories'] }) {
  if (categories.length === 0) {
    return <p className="feature-empty">No synced budget allocations yet.</p>;
  }

  return (
    <ul className="feature-list budget-list">
      {categories.map((category) => (
        <li key={category.id}>
          <strong>{category.name}</strong>
          <span>{minorToDisplay(category.amountMinor, category.currency)}</span>
        </li>
      ))}
    </ul>
  );
}

function GroupList({ groups }: { groups: CommunityGroup[] }) {
  return (
    <ul className="group-list">
      {groups.map((group) => (
        <li key={group.id}>
          <strong>{group.name}</strong>
          <span>{group.description}</span>
        </li>
      ))}
    </ul>
  );
}

function DiscussionList({ posts }: { posts: DiscussionPost[] }) {
  if (posts.length === 0) {
    return <p className="feature-empty">No group discussions yet.</p>;
  }

  return (
    <ul className="discussion-list">
      {posts.slice(0, 5).map((post) => (
        <li key={post.id}>
          <strong>{post.group?.name ?? 'Community'}</strong>
          <p>{post.body}</p>
          <span>{post.author.displayName} · {relativeTime(post.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

function ChatComposer({
  title,
  channel,
  messages,
  onSend
}: {
  title: string;
  channel: 'GLOBAL' | 'PRIVATE';
  messages: ChatMessage[];
  onSend: (channel: 'GLOBAL' | 'PRIVATE', body: string) => void;
}) {
  const [body, setBody] = useState('');
  const channelLabel = channel.toLowerCase();

  return (
    <div className="chat-thread">
      <h3>{title}</h3>
      <div className="chat-messages">
        {messages.length === 0 ? <p className="feature-empty">No {channelLabel} messages yet.</p> : null}
        {messages.slice(0, 4).map((message) => (
          <article key={message.id}>
            <strong>{message.sender.displayName}</strong>
            <p>{message.body}</p>
          </article>
        ))}
      </div>
      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSend(channel, body);
          setBody('');
        }}
      >
        <input value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Write a ${channelLabel} message`} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

function Avatar({ user }: { user: { displayName: string; avatarUrl?: string | null } }) {
  const initials = useMemo(() => initialsFor(user.displayName), [user.displayName]);

  return (
    <span className="community-avatar" aria-hidden="true">
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
    </span>
  );
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PB';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function maskWallet(value: string | null) {
  if (!value) return 'No wallet linked';
  return value.length > 14 ? `${value.slice(0, 6)}...${value.slice(-6)}` : value;
}

function minorToDisplay(value: string, currency: string) {
  const minor = Number(value);
  return `${currency} ${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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
