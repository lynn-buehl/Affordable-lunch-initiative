import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

/**
 * Counts one attempt against `key` and reports whether it is still within
 * `limit` per `windowSeconds`. One atomic statement, so two simultaneous
 * requests can't both slip under the limit.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const expired = sql`${rateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds})`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count <= limit;
}

export async function clearRateLimit(key: string) {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}

/** Best-effort caller address, as reported by the hosting platform's proxy. */
export async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
