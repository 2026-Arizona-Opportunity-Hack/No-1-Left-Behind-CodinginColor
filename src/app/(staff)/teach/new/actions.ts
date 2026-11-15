"use server";

import { can } from "@/lib/permissions";
import type { RosterRow } from "@/lib/roster-csv";
import { addStudents, assignModules, createClass, setSchedule } from "@/server/classes";
import { getStaff } from "@/server/auth";

// The class setup wizard's saves. Each wraps Maulik's class functions (#9), which validate input
// and run as the signed-in teacher, so the database's rules apply.

async function teacherOnly() {
  const staff = await getStaff();
  if (!can(staff,"classes.manage")) throw new Error("Sign in as a teacher to set up a class.");
}

export async function createClassStep(name: string, school: string) {
  await teacherOnly();
  return createClass({ name, school });
}

export async function addStudentsStep(classId: string, rows: RosterRow[]) {
  await teacherOnly();
  return addStudents(classId, rows.map((r) => ({ name: r.name, ...(r.school ? { school: r.school } : {}) })));
}

export async function assignModulesStep(classId: string, moduleIds: string[]) {
  await teacherOnly();
  return assignModules(classId, moduleIds);
}

export async function scheduleStep(classId: string, sessions: { session_date: string; lesson_id: string }[]) {
  await teacherOnly();
  return setSchedule(classId, sessions);
}
