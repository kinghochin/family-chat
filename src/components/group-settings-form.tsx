"use client";

import { useActionState } from "react";
import { updateHouseholdSettings, type HouseholdSettingsState } from "@/app/settings/actions";

const initialState: HouseholdSettingsState = { ok: false };

export function GroupSettingsForm({ initial }: { initial: { name: string; description: string; avatarLabel: string } }) {
  const [state, formAction, pending] = useActionState(updateHouseholdSettings, initialState);

  return <form className="group-settings-form" action={formAction}>
    <label>Group name<input name="name" defaultValue={initial.name} maxLength={80} required /></label>
    <label>Group description<textarea name="description" defaultValue={initial.description} maxLength={160} rows={3} required /></label>
    <label>Group avatar label<input name="avatar_label" defaultValue={initial.avatarLabel} maxLength={2} required /></label>
    <button className="primary-button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save group details"}</button>
    {state.error && <p className="settings-feedback error" role="alert">{state.error}</p>}
    {state.ok && <p className="settings-feedback success" role="status">{state.message}</p>}
  </form>;
}
