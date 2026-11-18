import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { ExamRunner } from '@/components/ExamRunner'
import { findByField } from '@/lib/payload'

export default async function StudentExamPage({ params }: { params: Promise<{ code: string }> }) {
  await connection()
  const { code } = await params
  const exam = await findByField('exams', 'code', code, { depth: 0 })
  if (!exam || exam.status !== 'active') notFound()

  return (
    <ExamRunner
      exam={{
        id: String(exam.id),
        title: exam.title,
        subject: exam.subject,
        description: exam.description ?? undefined,
        durationMinutes: exam.durationMinutes,
        questions: (exam.questions ?? []).map((question, index) => ({
          id: question.id ?? String(index),
          prompt: question.prompt,
          points: question.points ?? 1,
          options: (question.options ?? []).map((option) => option.text),
        })),
      }}
    />
  )
}
