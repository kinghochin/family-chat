"use client";

import { useActionState } from "react";
import { createMemberInvite, removeHouseholdMember, updateHouseholdMember, updateProfileDetails, type MemberSettingsState } from "@/app/settings/member-actions";

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

export function MemberRow({ userId, displayName, email, initials, tone, role, canManage }: { userId: string; displayName: string; email: string; initials: string; tone: string; role: string; canManage: boolean }) {
  const [editState, editAction, editPending] = useActionState(updateHouseholdMember, initialState);
  const [removeState, removeAction, removePending] = useActionState(removeHouseholdMember, initialState);
  return <div className="member-row member-row-manage">
    <span className={`member-avatar ${tone}`}>{initials}</span>
    <div className="member-row-info"><strong>{displayName}</strong><small>{email} · {role}</small></div>
    {canManage && <div className="member-row-actions">
      <details className="member-edit"><summary className="more-button" aria-label={`Edit ${displayName}`}>Edit</summary>
        <form action={editAction} className="member-inline-form"><input type="hidden" name="user_id" value={userId} /><input name="display_name" defaultValue={displayName} maxLength={80} aria-label={`New name for ${displayName}`} required /><button className="outline-button" type="submit" disabled={editPending}>{editPending ? "Saving…" : "Save"}</button></form>
      </details>
      <form action={removeAction} onSubmit={(event) => { if (!window.confirm(`Drop ${displayName} from this household?`)) event.preventDefault(); }}><input type="hidden" name="user_id" value={userId} /><button className="danger-button" type="submit" disabled={removePending}>{removePending ? "Dropping…" : "Drop"}</button></form>
    </div>}
    {editState.error && <span className="settings-feedback error">{editState.error}</span>}
    {removeState.error && <span className="settings-feedback error">{removeState.error}</span>}
    {removeState.ok && <span className="settings-feedback success">{removeState.message}</span>}
  </div>;
}
