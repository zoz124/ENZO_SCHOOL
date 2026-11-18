import { getPayload } from "payload"
import { testConfig } from "./payload.test.config"
const run = async () => {
  const p = await getPayload({ config: testConfig })
  const cfg = p.config.collections.find(c => c.slug === "exam-attempts")
  console.log("ACCESS UPDATE SOURCE:\n", cfg.access.update.toString())
  process.exit(0)
}
run().catch(e => { console.error("ERR", e.message); process.exit(1) })
