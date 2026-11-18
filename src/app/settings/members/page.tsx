import { FamilyShell, getMemberDetails } from "@/components/family-shell";

export const instant = false;

export default async function MembersPage() {
  const member = await getMemberDetails();
  const members = [
    { n: member.displayName, u: member.email, i: member.initials, t: "dark", s: "Signed in" },
    { n: "Mum", u: "@margaret", i: "M", t: "peach", s: "Member" },
    { n: "Dad", u: "@david", i: "D", t: "blue", s: "Member" },
    { n: "Sophie", u: "@sophie", i: "S", t: "green", s: "Member" },
  ];

  return <FamilyShell active="members" title="Family members" subtitle="Everyone sees the shared family memory.">
    <section className="settings-layout"><div className="settings-card"><div className="settings-card-head"><div><span className="family-overline">HOUSEHOLD</span><h2>Members</h2></div><button className="primary-button" type="button">＋ Invite member</button></div><p className="settings-note">Messages are shared with every active family member. Usernames identify who sent each message.</p>{members.map((m)=><div className="member-row" key={m.u}><span className={`member-avatar ${m.t}`}>{m.i}</span><div><strong>{m.n}</strong><small>{m.u}</small></div><span className="member-status">{m.s}</span><button className="more-button" type="button">···</button></div>)}</div><div className="settings-card privacy-card"><span className="privacy-icon">⌁</span><span className="family-overline">SHARED BY DESIGN</span><h2>One family memory</h2><p>Every message sent to the Telegram group or web app is visible to active household members. Deleted messages remain as a history marker so summaries stay auditable.</p><button className="outline-button" type="button">Read privacy settings</button></div></section>
  </FamilyShell>;
}
