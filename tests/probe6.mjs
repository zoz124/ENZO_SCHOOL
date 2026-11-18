import { getPayload } from "payload"
import { testConfig } from "./payload.test.config"

const run = async () => {
  const p = await getPayload({ config: testConfig })
  const t = await p.create({ collection: "teachers", data: { name: "TT", email: `u${Date.now()}@s.test`, password: "password123" }, overrideAccess: false })
  const user = { id: t.id, email: t.email, collection: "teachers" }
  const exam = await p.create({ collection: "exams", data: { title: "Exam Six", subject: "Math", durationMinutes: 30, status: "active", code: "h"+Date.now().toString().slice(-8), owner: t.id, questions: [{ prompt: "q1?", options: [{text:"a"},{text:"b"}], correctOption: 0, points: 1 }] }, user, overrideAccess: false })
  const token = crypto.randomUUID()
  const att = await p.create({ collection: "exam-attempts", data: { studentName: "S1", exam: exam.id, teacher: 0, submissionToken: token, status: "in-progress", startedAt: new Date().toISOString(), score: 0, maxScore: 0, wrongCount: 0, answers: [] }, context: { studentSubmission: true }, overrideAccess: false })
  const cfg = p.config.collections.find(c => c.slug === "exam-attempts")
  const fn = cfg.access.update
  // replicate exactly what payload passes
  const args = { req: { payload: p, context: { studentSubmission: true }, user: null }, id: att.id, data: { submissionToken: token, answers: [] } }
  console.log("manual:", await fn(args))
  console.log("no id:", await fn({ ...args, id: undefined }))
  console.log("no ctx:", await fn({ ...args, req: { payload: p, context: {}, user: null } }))
  console.log("no token:", await fn({ ...args, data: { answers: [] } }))
  process.exit(0)
}
run().catch(e => { console.error("ERR", e.message); process.exit(1) })
