import { getPayload } from "payload"
import { testConfig } from "./payload.test.config"

const run = async () => {
  const p = await getPayload({ config: testConfig })
  const t = await p.create({ collection: "teachers", data: { name: "TT", email: `v${Date.now()}@s.test`, password: "password123" }, overrideAccess: false })
  const user = { id: t.id, email: t.email, collection: "teachers" }
  const exam = await p.create({ collection: "exams", data: { title: "Exam Five", subject: "Math", durationMinutes: 30, status: "active", code: "g"+Date.now().toString().slice(-8), owner: t.id, questions: [{ prompt: "q1?", options: [{text:"a"},{text:"b"}], correctOption: 0, points: 1 }] }, user, overrideAccess: false })
  const token = crypto.randomUUID()
  const att = await p.create({ collection: "exam-attempts", data: { studentName: "S1", exam: exam.id, teacher: 0, submissionToken: token, status: "in-progress", startedAt: new Date().toISOString(), score: 0, maxScore: 0, wrongCount: 0, answers: [] }, context: { studentSubmission: true }, overrideAccess: false })
  const doc = await p.findByID({ collection: "exam-attempts", id: att.id, depth: 0, overrideAccess: true, showHiddenFields: true })
  console.log("status:", JSON.stringify(doc.status))
  console.log("token eq:", String(doc.submissionToken) === String(token))
  console.log("status==='in-progress':", doc.status === "in-progress")
  process.exit(0)
}
run().catch(e => { console.error("ERR", e.message); process.exit(1) })
