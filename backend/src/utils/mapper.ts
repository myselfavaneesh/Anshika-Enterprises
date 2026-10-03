/**
 * Normalizes entity objects by:
 * 1. Ensuring both `id` and `_id` are populated for seamless compatibility.
 * 2. Converting Prisma `Decimal` instances to standard JavaScript `number`s so the frontend
 *    doesn't receive serialized string decimals that break numeric operations (e.g. .toFixed()).
 */
export const mapEntityId = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;

  // Convert Prisma Decimal or Decimal.js instances to standard JS number
  if (typeof obj.toNumber === 'function') {
    return obj.toNumber();
  }

  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(mapEntityId);
  }

  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = mapEntityId(obj[key]);
    }
    if (res.id !== undefined && res._id === undefined) {
      res._id = res.id;
    }
    return res;
  }

  return obj;
};

// Deprecated alias for backward compatibility
export const mapToMongoose = mapEntityId;


