import { seedAdmin } from "../api/lib/db.js";

(async () => {
  await seedAdmin();
  process.exit(0);
})();