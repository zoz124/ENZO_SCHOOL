import { getPayload } from "payload"
import { testConfig } from "./payload.test.config"

const run = async () => {
  const p = await getPayload({ config: testConfig })
  const t = await p.create({ collection: "teachers", data: { name: "TT", email: `x${Date.now()}@s.test`, password: "password123" }, overrideAccess: false })
  const user = { id: t.id, email: t.email, collection: "teachers" }
  const exam = await p.create({ collection: "exams", data: { title: "Exam One", subject: "Math", durationMinutes: 30, status: "active", code: "c"+Date.now().toString().slice(-8), owner: t.id, questions: [{ prompt: "q1?", options: [{text:"a"},{text:"b"}], correctOption: 0, points: 1 }] }, user, overrideAccess: false })
  console.log("exam", exam.id, "owner", exam.owner, typeof exam.owner)
  const token = crypto.randomUUID()
  const att = await p.create({ collection: "exam-attempts", data: { studentName: "S1", exam: exam.id, teacher: 0, submissionToken: token, status: "in-progress", startedAt: new Date().toISOString(), score: 0, maxScore: 0, wrongCount: 0, answers: [] }, context: { studentSubmission: true }, overrideAccess: false })
  console.log("attempt", att.id, "teacher", att.teacher, "status", att.status)
  // now try update
  try {
    const up = await p.update({ collection: "exam-attempts", id: att.id, data: { submissionToken: token, answers: [] }, context: { studentSubmission: true }, overrideAccess: false })
    console.log("update ok", up.status, up.score)
  } catch (e) { console.log("UPDATE FAIL", e.message) }
  // now delete exam
  try {
    await p.delete({ collection: "exams", id: exam.id, user, overrideAccess: false })
    console.log("exam deleted")
  } catch (e) { console.log("DELETE FAIL", e.message) }
  const left = await p.find({ collection: "exam-attempts", where: { exam: { equals: exam.id } }, overrideAccess: true })
  console.log("orphan attempts:", left.docs.length)
  process.exit(0)
}
run().catch(e => { console.error(e); process.exit(1) })

