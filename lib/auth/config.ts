import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase().trim()))
          .limit(1);

        if (!user || !user.passwordHash || user.status !== "active") {
          return null;
        }

        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = user.id as string;
        token.role = user.role as "admin" | "member";
        token.status = user.status as "invited" | "active" | "left";
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.status = token.status;
      }
      return session;
    },
  },
});
