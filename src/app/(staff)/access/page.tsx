import { getStaff } from "@/server/auth";
import { redirect } from "next/navigation";
export default async function AccessPage() {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  return (
    <div className="max-w-2xl space-y-3 rounded-[20px] bg-card p-6 border border-border">
      <h1 className="text-3xl font-bold">Access needed</h1>
      <p>
        Your role is {staff.roleName}. Ask a CIC administrator to grant access
        to this area. You can use the links above for the areas available to
        you.
      </p>
    </div>
  );
}
