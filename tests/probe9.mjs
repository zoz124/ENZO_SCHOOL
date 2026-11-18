import { getPayload } from "payload"
import { testConfig } from "./payload.test.config"
const run = async () => {
  const p = await getPayload({ config: testConfig })
  const t = await p.create({ collection: "teachers", data: { name: "TT", email: `r${Date.now()}@s.test`, password: "password123" }, overrideAccess: false })
  const user = { id: t.id, email: t.email, collection: "teachers" }
  const exam = await p.create({ collection: "exams", data: { title: "Exam Eight", subject: "Math", durationMinutes: 30, status: "active", code: "k"+Date.now().toString().slice(-8), owner: t.id, questions: [{ prompt: "q1?", options: [{text:"a"},{text:"b"}], correctOption: 0, points: 1 }] }, user, overrideAccess: false })
  const token = crypto.randomUUID()
  await p.create({ collection: "exam-attempts", data: { studentName: "S1", exam: exam.id, teacher: 0, submissionToken: token, status: "in-progress", startedAt: new Date().toISOString(), score: 0, maxScore: 0, wrongCount: 0, answers: [] }, context: { studentSubmission: true }, overrideAccess: false })
  try {
    await p.delete({ collection: "exams", id: exam.id, user, overrideAccess: false })
    console.log("deleted OK")
  } catch (e) { console.log("DELETE ERR:", e.message) }
  process.exit(0)
}
run().catch(e => { console.error("ERR", e.message); process.exit(1) })
