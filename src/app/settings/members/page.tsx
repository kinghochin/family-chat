import { FamilyShell, getGroupDetails, getMemberDetails } from "@/components/family-shell";
import { GroupSettingsForm } from "@/components/group-settings-form";
import { InviteMemberForm, MemberRow, ProfileDetailsForm } from "@/components/member-settings-forms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HouseholdMember = { userId: string; displayName: string; email: string; initials: string; role: string };

async function getHouseholdMembers(): Promise<{ members: HouseholdMember[]; canManage: boolean }> {
  try {
    const supabase = await createSupabaseServerClient();
    const [{ data: memberRows }, { data: { user } }, { data: owner }] = await Promise.all([
      supabase.from("household_members").select("user_id, role, joined_at").is("removed_at", null).order("joined_at"),
      supabase.auth.getUser(),
      supabase.rpc("is_household_owner"),
    ]);
    const ids = (memberRows ?? []).map((row) => row.user_id);
    const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
    const currentUserId = user?.id;
    const currentUserEmail = user?.email;
    const members = (memberRows ?? []).map((row) => {
      const displayName = profileMap.get(row.user_id) || "Family member";
      const initials = displayName.split(/\s+/).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase();
      return { userId: row.user_id, displayName, email: row.user_id === currentUserId ? (currentUserEmail || "Signed in") : "Household member", initials, role: row.role };
    });
    return { members, canManage: owner === true };
  } catch {
    return { members: [], canManage: false };
  }
}

export default async function MembersPage() {
  const [member, group, household] = await Promise.all([getMemberDetails(), getGroupDetails(), getHouseholdMembers()]);
  return <FamilyShell active="members" title="Family members" subtitle="Everyone sees the shared family memory.">
    <section className="settings-layout">
      <div className="settings-card">
        <div className="settings-card-head"><div><span className="family-overline">GROUP DETAILS</span><h2>{group.name}</h2></div><span className="household-avatar large">{group.avatarLabel}</span></div>
        <p className="settings-note">These details appear across the family workspace for everyone in the household.</p>
        <GroupSettingsForm initial={group} />
        <div className="settings-divider" />
        <ProfileDetailsForm displayName={member.displayName} />
      </div>
      <div className="settings-card">
        <div className="settings-card-head"><div><span className="family-overline">ADD MEMBER</span><h2>Grow the group</h2></div></div>
        <p className="settings-note">Create a private link to add someone to this household. They become an active member after signing up with the invited email.</p>
        <InviteMemberForm />
      </div>
      <div className="settings-card">
        <div className="settings-card-head"><div><span className="family-overline">HOUSEHOLD</span><h2>Members</h2></div><span className="member-count">{household.members.length} active</span></div>
        <p className="settings-note">Owners can edit member names or drop members. Dropped members lose household membership but their account is not deleted.</p>
        {household.members.length ? household.members.map((m, index) => <MemberRow key={m.userId} {...m} tone={["dark", "peach", "blue", "green"][index % 4]} canManage={household.canManage && m.role !== "owner"} />) : <p className="settings-note">No household members yet. Run migration 006 and 007, then accept an invite.</p>}
      </div>
      <div className="settings-card privacy-card"><span className="privacy-icon">⌁</span><span className="family-overline">SHARED BY DESIGN</span><h2>One family memory</h2><p>Every message sent to the Telegram group or web app is visible to active household members. Deleted messages remain as a history marker so summaries stay auditable.</p><button className="outline-button" type="button">Read privacy settings</button></div>
    </section>
  </FamilyShell>;
}
