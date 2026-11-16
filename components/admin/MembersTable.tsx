import type { User } from "@/lib/db/schema";
import { Badge } from "@/components/ui/Badge";
import { MarkLeftDialog } from "@/components/admin/MarkLeftDialog";
import tableStyles from "@/components/ui/Table.module.css";

export function MembersTable({
  members,
  computedBalances,
}: {
  members: User[];
  computedBalances: Map<string, number>;
}) {
  return (
    <div className={tableStyles.wrapper}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td>{member.name}</td>
              <td>{member.email}</td>
              <td>
                {member.role === "admin" ? (
                  <Badge kind="negative">Admin</Badge>
                ) : (
                  "Member"
                )}
              </td>
              <td>
                <Badge
                  kind={
                    member.status === "active"
                      ? "positive"
                      : member.status === "invited"
                        ? "accent"
                        : "neutral"
                  }
                >
                  {member.status === "invited"
                    ? "Invited"
                    : member.status === "active"
                      ? "Active"
                      : "Left"}
                </Badge>
              </td>
              <td>
                {member.status === "active" ? (
                  <MarkLeftDialog
                    userId={member.id}
                    userName={member.name}
                    computedBalanceCents={computedBalances.get(member.id) ?? 0}
                  />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
