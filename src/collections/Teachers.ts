import type { Access, CollectionConfig } from 'payload'

const isTeacher = (user: unknown): user is { id: string; collection: 'teachers' } =>
  Boolean(
    user && typeof user === 'object' && 'collection' in user && user.collection === 'teachers',
  )

const teacherSelf: Access = ({ req }) => {
  if (!isTeacher(req.user)) return false
  return { id: { equals: req.user.id } }
}

export const Teachers: CollectionConfig = {
  slug: 'teachers',
  labels: {
    singular: 'Teacher',
    plural: 'Teachers',
  },
  admin: {
    hidden: true,
    useAsTitle: 'name',
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 60 * 60 * 24 * 7,
  },
  access: {
    create: () => true,
    read: teacherSelf,
    update: teacherSelf,
    delete: () => false,
    admin: () => false,
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
  ],
}
