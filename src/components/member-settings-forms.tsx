"use client";

import { useActionState } from "react";
import { createMemberInvite, updateProfileDetails, type MemberSettingsState } from "@/app/settings/member-actions";

const initialState: MemberSettingsState = { ok: false };

export function ProfileDetailsForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState(updateProfileDetails, initialState);
  return <form className="member-settings-form" action={formAction}>
    <label>Your display name<input name="display_name" defaultValue={displayName} maxLength={80} required /></label>
    <button className="outline-button" type="submit" disabled={pending}>{pending ? "Saving…" : "Update profile"}</button>
    {state.error && <p className="settings-feedback error" role="alert">{state.error}</p>}
    {state.ok && <p className="settings-feedback success" role="status">{state.message}</p>}
  </form>;
}

export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState(createMemberInvite, initialState);
  return <form className="member-settings-form" action={formAction}>
    <label>Member email<input name="email" type="email" placeholder="name@example.com" required /></label>
    <button className="primary-button" type="submit" disabled={pending}>{pending ? "Creating invite…" : "＋ Create invite"}</button>
    {state.error && <p className="settings-feedback error" role="alert">{state.error}</p>}
    {state.ok && <p className="settings-feedback success" role="status">{state.message}</p>}
    {state.inviteLink && <label>Shareable invite link<input readOnly value={state.inviteLink} aria-label="Shareable invite link" /></label>}
  </form>;
}
