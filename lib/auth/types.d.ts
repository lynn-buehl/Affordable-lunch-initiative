import type { DefaultSession } from "next-auth";

type Role = "admin" | "member";
type Status = "invited" | "active" | "left";

declare module "next-auth" {
  interface User {
    role: Role;
    status: Status;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      status: Status;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    role: Role;
    status: Status;
  }
}
