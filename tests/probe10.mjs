import { getPayload } from "payload"
import { testConfig } from "./payload.test.config"
const run = async () => {
  const p = await getPayload({ config: testConfig })
  const email = `dbg${Date.now()}@school.test`
  try {
    const doc = await p.create({ collection: "teachers", data: { name: "أ/ محمد أحمد", email, password: "password123" }, overrideAccess: false })
    console.log("create ok", doc.id)
  } catch (e) { console.log("CREATE ERR:", e.message) }
  try {
    const r = await p.login({ collection: "teachers", data: { email, password: "password123" }, overrideAccess: false })
    console.log("login ok", !!r.token)
  } catch (e) { console.log("LOGIN ERR:", e.message) }
  process.exit(0)
}
run().catch(e => { console.error("ERR", e.message); process.exit(1) })
