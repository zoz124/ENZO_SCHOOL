import { getPayload } from "payload"
import { testConfig } from "./payload.test.config"

const run = async () => {
  const p = await getPayload({ config: testConfig })
  const t = await p.create({ collection: "teachers", data: { name: "TT", email: `z${Date.now()}@s.test`, password: "password123" }, overrideAccess: false })
  const user = { id: t.id, email: t.email, collection: "teachers" }
  const exam = await p.create({ collection: "exams", data: { title: "Exam Three", subject: "Math", durationMinutes: 30, status: "active", code: "e"+Date.now().toString().slice(-8), owner: t.id, questions: [{ prompt: "q1?", options: [{text:"a"},{text:"b"}], correctOption: 0, points: 1 }] }, user, overrideAccess: false })
  const token = crypto.randomUUID()
  const att = await p.create({ collection: "exam-attempts", data: { studentName: "S1", exam: exam.id, teacher: 0, submissionToken: token, status: "in-progress", startedAt: new Date().toISOString(), score: 0, maxScore: 0, wrongCount: 0, answers: [] }, context: { studentSubmission: true }, overrideAccess: false })
  // Try update with overrideAccess TRUE but context set, to see if hook works
  try {
    const up = await p.update({ collection: "exam-attempts", id: att.id, data: { submissionToken: token, answers: [] }, context: { studentSubmission: true }, overrideAccess: true })
    console.log("overrideAccess=true update OK:", up.status, up.score, up.maxScore)
  } catch (e) { console.log("override TRUE FAIL:", e.message) }
  process.exit(0)
}
run().catch(e => { console.error("ERR", e.message); process.exit(1) })
