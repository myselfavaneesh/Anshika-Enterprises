export const mapToMongoose = (obj: any): any => {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(mapToMongoose);
  if (typeof obj === 'object' && obj !== null) {
    const { id, ...rest } = obj;
    // Recursively map any nested objects/arrays if necessary, but shallow is usually enough
    // For safety, just do shallow map for the top level:
    if (id !== undefined) {
      return { ...rest, _id: id };
    }
  }
  return obj;
};
