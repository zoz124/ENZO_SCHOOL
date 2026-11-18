import type { Access, CollectionConfig } from 'payload'

const isTeacher = (user: unknown): user is { id: string; collection: 'teachers' } =>
  Boolean(
    user && typeof user === 'object' && 'collection' in user && user.collection === 'teachers',
  )

const isPayloadAdmin = (user: unknown): boolean =>
  Boolean(
    user && typeof user === 'object' && 'collection' in user && user.collection === 'admins',
  )

const teacherSelfOrAdmin: Access = ({ req }) => {
  if (isPayloadAdmin(req.user)) return true
  if (isTeacher(req.user)) return { id: { equals: req.user.id } }
  return false
}

export const Teachers: CollectionConfig = {
  slug: 'teachers',
  labels: {
    singular: 'Teacher',
    plural: 'Teachers',
  },
  admin: {
    group: 'ENZO School',
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'subject', 'status', 'createdAt'],
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 60 * 60 * 24 * 7,
  },
  access: {
    create: () => true,
    read: teacherSelfOrAdmin,
    update: teacherSelfOrAdmin,
    delete: ({ req }) => isPayloadAdmin(req.user),
    admin: ({ req }) => isPayloadAdmin(req.user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      minLength: 2,
      maxLength: 80,
    },
    {
      name: 'subject',
      type: 'text',
      maxLength: 80,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      required: true,
      options: [
        { label: 'قيد المراجعة (Pending)', value: 'pending' },
        { label: 'مقبول / مفعّل (Approved)', value: 'approved' },
        { label: 'مرفوض (Rejected)', value: 'rejected' },
      ],
      access: {
        update: ({ req }) => isPayloadAdmin(req.user),
      },
      admin: {
        description: 'حالة اعتماد المعلم. المعلم المقبول (Approved) فقط يستطيع الدخول وإنشاء الامتحانات.',
      },
    },
  ],
}
