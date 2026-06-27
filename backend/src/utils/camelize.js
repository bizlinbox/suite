function camelize(obj) {
  if (Array.isArray(obj)) {
    return obj.map(camelize);
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = camelize(obj[key]);
    }
    return result;
  }
  return obj;
}

module.exports = camelize;
