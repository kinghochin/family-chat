import Link from "next/link";
import { signOutAction } from "@/app/auth-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type MemberDetails = { displayName: string; email: string; initials: string };

export async function getMemberDetails(): Promise<MemberDetails> {
  const fallback = { displayName: "Jamie Chen", email: "Local preview", initials: "JC" };

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fallback;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const displayName = profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Family member";
    const initials = displayName.split(/\s+/).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase();
    return { displayName, email: user.email || "Signed in", initials };
  } catch {
    return fallback;
  }
}

function ProfileMenu({ member, compact = false }: { member: MemberDetails; compact?: boolean }) {
  return <details className={`profile-menu ${compact ? "profile-menu-compact" : ""}`}>
    <summary className="profile-menu-trigger" aria-label="Open profile settings"><span className={`member-avatar ${compact ? "dark" : ""}`}>{member.initials}</span></summary>
    <div className="profile-menu-panel">
      <strong>{member.displayName}</strong>
      <small>{member.email}</small>
      <Link href="/settings/members">Family settings</Link>
      <Link href="/settings/members">Profile details</Link>
      <form action={signOutAction}><button type="submit">Sign out</button></form>
    </div>
  </details>;
}

export async function FamilyShell({
  children,
  active = "inbox",
  title = "Family space",
  subtitle = "One place for the conversations that matter.",
}: {
  children: React.ReactNode;
  active?: "inbox" | "topics" | "artifacts" | "members" | "flow";
  title?: string;
  subtitle?: string;
}) {
  const member = await getMemberDetails();

  return (
    <main className="family-shell">
      <aside className="family-sidebar">
        <Link href="/inbox" className="family-logo"><span>✦</span> Gatherly</Link>
        <div className="family-household"><span className="household-avatar">H</span><div><strong>The Harris family</strong><small>5 members</small></div><span className="chevron">⌄</span></div>
        <nav className="family-nav" aria-label="Family navigation">
          <Link className={active === "inbox" ? "active" : ""} href="/inbox"><span>▤</span> Inbox</Link>
          <Link className={active === "topics" ? "active" : ""} href="/topics"><span>◈</span> Topics <b>4</b></Link>
          <Link className={active === "artifacts" ? "active" : ""} href="/artifacts"><span>▧</span> Artifacts <b>3</b></Link>
          <Link className={active === "members" ? "active" : ""} href="/settings/members"><span>♧</span> Family members</Link>
          <Link className={active === "flow" ? "active" : ""} href="/flow"><span>⌁</span> Product flow</Link>
        </nav>
        <div className="family-sidebar-bottom"><div className="family-member"><ProfileMenu member={member} /><div><strong>{member.displayName}</strong><small>{member.email}</small></div></div></div>
      </aside>
      <section className="family-main">
        <header className="family-topbar"><div><span className="family-overline">THE HARRIS FAMILY</span><h1>{title}</h1><p>{subtitle}</p></div><div className="family-top-actions"><button className="family-round-button" type="button">⌕</button><button className="family-round-button" type="button">♧</button><ProfileMenu member={member} compact /></div></header>
        <div className="family-content">{children}</div>
      </section>
    </main>
  );
}
