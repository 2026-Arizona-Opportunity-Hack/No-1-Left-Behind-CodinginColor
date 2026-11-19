"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveMessage, useSave } from "@/components/curriculum/use-save";
import {
  PERMISSIONS,
  type Permission,
  type StaffRoleDefinition,
} from "@/lib/permissions";
import { changeStaffRole, removeRole, saveRole } from "./actions";

type Props = {
  roles: StaffRoleDefinition[];
  people: { id: string; display_name: string | null; role: string }[];
  currentUserId: string;
};
const BUILT_IN = ["admin", "instructor", "reviewer"];

export function RoleManager({ roles, people, currentUserId }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([
    "curriculum.read",
  ]);
  const [replacement, setReplacement] = useState("");
  const { pending, message, save } = useSave();
  const edit = (role?: StaffRoleDefinition) => {
    setEditing(role?.id ?? null);
    setName(role?.name ?? "");
    setPermissions(role?.permissions ?? ["curriculum.read"]);
    setReplacement("");
  };
  const slug =
    editing ??
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40);
  return (
    <div className="space-y-6">
      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Staff roles"
      >
        {roles.map((role) => (
          <div key={role.id} className={`space-y-3 rounded-[20px] bg-card p-6 ${BUILT_IN.includes(role.id) ? "border border-border" : "border-2 border-primary"}`}>
            <span className={`inline-flex min-h-8 items-center rounded-[10px] px-3 text-base font-bold ${BUILT_IN.includes(role.id) ? (role.id === "admin" ? "bg-primary text-white" : "bg-lilac text-lilac-ink") : "border-2 border-primary bg-white text-primary"}`}>{BUILT_IN.includes(role.id) ? "Built in" : "Custom"}</span>
            <h2 className="text-2xl font-bold">{role.name}</h2>
            <p className="text-base text-muted-foreground">
              {people.filter((p) => p.role === role.id).length} staff assigned
            </p>
            <ul className="list-disc space-y-1 pl-5 text-base">
              {role.permissions.map((p) => (
                <li key={p}>{PERMISSIONS[p].label}</li>
              ))}
            </ul>
            {role.id !== "admin" ? (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => edit(role)}
              >
                Edit role
              </Button>
            ) : (
              <p className="text-base text-muted-foreground">
                Full access. At least one administrator is kept.
              </p>
            )}
          </div>
        ))}
      </section>
      <form
        className="space-y-4 rounded-[20px] border-2 border-primary bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save(
            () => saveRole({ id: slug, name, permissions }),
            "Role saved",
            () => edit(),
          );
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[26px] font-bold">
            {editing ? "Edit role" : "Add a role"}
          </h2>
          {editing && (
            <Button variant="ghost" type="button" onClick={() => edit()}>
              Cancel editing
            </Button>
          )}
        </div>
        <Label htmlFor="role-name">Role name</Label>
        <Input
          id="role-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          placeholder="e.g. Mentor"
        />
        <fieldset className="space-y-3">
          <legend className="mb-3 font-semibold">What can this role do?</legend>
          {(
            Object.entries(PERMISSIONS) as [
              Permission,
              (typeof PERMISSIONS)[Permission],
            ][]
          ).map(([permission, definition]) => (
            <label
              key={permission}
              className="flex min-h-14 items-start gap-3.5 rounded-xl border-2 border-border bg-white p-3.5 has-checked:border-primary has-checked:bg-secondary"
            >
              <input
                type="checkbox"
                className="mt-1 size-6"
                checked={permissions.includes(permission)}
                onChange={(e) =>
                  setPermissions((current) =>
                    e.target.checked
                      ? [...current, permission]
                      : current.filter((p) => p !== permission),
                  )
                }
              />
              <span>
                <span className="block font-bold">{definition.label} <span className="font-normal text-muted-foreground">({permissions.includes(permission) ? "allowed" : "not allowed"})</span></span>
                <span className="text-base text-muted-foreground">
                  {definition.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <Button type="submit" disabled={pending || !name.trim()}>
          Save role
        </Button>
        {editing && (
          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="replacement">Move this role&apos;s staff to</Label>
            <select
              id="replacement"
              className="h-12 w-full"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
            >
              <option value="">Choose if staff are assigned</option>
              {roles
                .filter((r) => r.id !== editing)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (
                  confirm(
                    `Delete ${name}? Assigned staff will move to the selected role.`,
                  )
                )
                  save(
                    () => removeRole(editing, replacement || undefined),
                    "Role deleted",
                    () => edit(),
                  );
              }}
            >
              Delete role
            </Button>
          </div>
        )}
      </form>
      <SaveMessage message={message} />
      <section className="space-y-3" aria-labelledby="staff-accounts">
        <h2 id="staff-accounts" className="text-[28px] font-bold">
          Staff accounts
        </h2>
        <p className="text-base text-muted-foreground">
          Staff sign in with their own accounts. Student access uses personal
          join codes and never receives staff permissions.
        </p>
        {people.map((person) => (
          <div
            key={person.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4 border border-border"
          >
            <span>
              {person.display_name || "Staff account"}
              {person.id === currentUserId ? " (you)" : ""}
            </span>
            <label className="flex items-center gap-2">
              <span className="sr-only">
                Role for {person.display_name || "staff account"}
              </span>
              <select
                aria-label={`Role for ${person.display_name || person.id}`}
                value={person.role}
                disabled={pending}
                className="h-12 min-w-44"
                onChange={(e) => {
                  const role = e.target.value;
                  if (confirm("Change this staff member's access?"))
                    save(
                      () => changeStaffRole(person.id, role),
                      "Staff access updated",
                    );
                }}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </section>
    </div>
  );
}
