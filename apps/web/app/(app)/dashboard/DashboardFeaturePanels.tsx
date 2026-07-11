export function DashboardFeaturePanels() {
  return (
    <section className="dashboard-feature-stack dashboard-home-workspace" aria-label="Dashboard workspace links">
      <a id="profile" className="dashboard-card feature-panel dashboard-workspace-link" href="/dashboard/community">
        <span>PROFILE</span>
        <strong>Edit your community profile</strong>
        <p>Update display name, avatar, cover photo, bio, currency preference, and privacy from the community workspace.</p>
      </a>

      <a id="budget" className="dashboard-card feature-panel dashboard-workspace-link" href="/dashboard/community">
        <span>BUDGET</span>
        <strong>Create budget allocations</strong>
        <p>Add food, bills, savings, and emergency categories synced to your authenticated Stellar account.</p>
      </a>

      <a id="community" className="dashboard-card feature-panel dashboard-workspace-link is-primary" href="/dashboard/community">
        <span>COMMUNITY</span>
        <strong>Open relief and social hub</strong>
        <p>View help posts with photos, donation pledges, groups, discussions, global chat, and private chat.</p>
      </a>
    </section>
  );
}
