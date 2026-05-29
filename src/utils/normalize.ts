export function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).toUpperCase();
}

export function normalizeObject(obj: any, exceptions: string[] = ['email', 'password', 'id', 'student_id', 'teacher_id']): any {
  if (!obj || typeof obj !== 'object') return obj;
  const out: any = { ...obj };
  Object.keys(out).forEach((key) => {
    const val = out[key];
    if (typeof val === 'string') {
      if (!exceptions.includes(key)) {
        out[key] = val.toUpperCase();
      }
    }
  });
  return out;
}
