/**
 * Normalizes entity objects by ensuring both `id` and `_id` are populated
 * for seamless compatibility between PostgreSQL Prisma backend and frontend expectations.
 */
export const mapEntityId = (obj: any): any => {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(mapEntityId);
  if (typeof obj === 'object' && obj !== null) {
    const { id, ...rest } = obj;
    if (id !== undefined) {
      return { id, ...rest, _id: id };
    }
  }
  return obj;
};

// Deprecated alias for backward compatibility
export const mapToMongoose = mapEntityId;

