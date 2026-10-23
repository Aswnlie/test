import { closeDatabase, db } from "../db/client.ts";
import { ensureDemoUsers } from "../db/demo-users.ts";

try {
  // rollback if password doesn't match
  const results = await db.transaction((tx) => ensureDemoUsers(tx));
  for (const result of results) console.log(result);
  console.log("Demo accounts verified. Existing accounts were preserved.");
} catch (error) {
  if (error instanceof Error && error.message.startsWith("Demo account ")) {
    console.error(error.message);
  } else {
    console.error(
      "Could not prepare demo accounts. Check MySQL, .env and migrations.",
    );
  }
  Deno.exitCode = 1;
} finally {
  await closeDatabase();
}
