import type { Access, CollectionConfig, FieldAccess, Where } from 'payload'

type AppUser = { id: string; collection: string }

const teacherOwned: Access = ({ req }) => {
  const user = req.user as AppUser | null
  if (user?.collection === 'admins') return true
  if (user?.collection !== 'teachers') {
    const publicExam: Where = { status: { equals: 'active' } }
    return publicExam
  }
  const ownedExam: Where = { owner: { equals: user.id } }
  return ownedExam
}

const teacherOnly: Access = ({ req }) => {
  const user = req.user as AppUser | null
  return user?.collection === 'teachers' || user?.collection === 'admins'
}

const teacherAnswerAccess: FieldAccess = ({ req }) => {
  const user = req.user as AppUser | null
  return user?.collection === 'teachers' || user?.collection === 'admins'
}

export const Exams: CollectionConfig = {
  slug: 'exams',
  labels: {
    singular: 'Exam',
    plural: 'Exams',
  },
  admin: {
    group: 'ENZO School',
    useAsTitle: 'title',
    defaultColumns: ['title', 'subject', 'status', 'durationMinutes', 'createdAt'],
  },
  access: {
    create: teacherOnly,
    read: teacherOwned,
    update: teacherOwned,
    delete: teacherOwned,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        const user = req.user as AppUser | null
        if (operation === 'create') {
          if (user?.collection !== 'teachers') {
            throw new Error('Only teachers can create exams.')
          }
          data.owner = user.id
          data.code = crypto.randomUUID().replaceAll('-', '').slice(0, 10)
        }
        return data
      },
    ],
    /**
     * Deleting an exam must also delete its student attempts. Without this the
     * foreign key from exam-attempts blocks the delete and the teacher can
     * never remove an exam that has been taken.
     */
    beforeDelete: [
      async ({ id, req }) => {
        const attempts = await req.payload.find({
          collection: 'exam-attempts',
          where: { exam: { equals: id } },
          depth: 0,
          limit: 0,
          pagination: false,
          overrideAccess: true,
        })
        for (const attempt of attempts.docs) {
          await req.payload.delete({
            collection: 'exam-attempts',
            id: attempt.id,
            overrideAccess: true,
          })
        }
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      minLength: 3,
      maxLength: 120,
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      maxLength: 80,
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'durationMinutes',
      type: 'number',
      required: true,
      min: 1,
      max: 300,
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar', readOnly: true },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'teachers',
      required: true,
      index: true,
      admin: { position: 'sidebar', readOnly: true },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'questions',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 100,
      fields: [
        {
          name: 'prompt',
          type: 'textarea',
          required: true,
          minLength: 2,
          maxLength: 500,
        },
        {
          name: 'options',
          type: 'array',
          required: true,
          minRows: 2,
          maxRows: 8,
          fields: [
            {
              name: 'text',
              type: 'text',
              required: true,
              maxLength: 250,
            },
          ],
        },
        {
          name: 'correctOption',
          type: 'number',
          required: true,
          min: 0,
          access: {
            read: teacherAnswerAccess,
          },
        },
        {
          name: 'points',
          type: 'number',
          required: true,
          min: 1,
          max: 100,
          defaultValue: 1,
        },
      ],
    },
  ],
}
