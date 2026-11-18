import { getPayload } from 'payload'
import { testConfig } from './payload.test.config'

const run = async () => {
  const payload = await getPayload({ config: testConfig })
  const t = await payload.create({
    collection: 'teachers',
    data: { name: 'Test Teacher', email: 'a@b.com', password: 'password123' },
    overrideAccess: false,
  })
  console.log('teacher created', t.id, t.email)
  const exam = await payload.create({
    collection: 'exams',
    data: {
      title: 'Unit 3 Exam',
      subject: 'Math',
      durationMinutes: 30,
      status: 'active',
      code: 'abc1234567',
      owner: t.id,
      questions: [{ prompt: 'What is 2+2?', options: [{text:'3'},{text:'4'}], correctOption: 1, points: 1 }],
    },
    user: t,
    overrideAccess: false,
  })
  console.log('exam created', exam.id, exam.code)
  process.exit(0)
}
run().catch((e) => { console.error('FAILED', e); process.exit(1) })
