/**
 * Register Number Generation Engine
 * Generates unique register numbers in format: YYSSSNNNN
 */

import { apiRequest } from './apiClient';

// Configuration
export const registerConfig = {
  SCHOOL_CODE: 'SBPS', // 4-letter school code
  SCHOOL_NAME: 'St. Blesses Public School',
  MAX_SEQUENCE: 9999,
  SEQUENCE_PAD: 4, // Zero-padding for NNNN (4 digits)
  YEAR_DIGITS: 2, // YY (last 2 digits of year)
  SCHOOL_CODE_DIGITS: 4, // SBPS (4 letters - or less/more if needed)
};

/**
 * Validates school code format (must be 3-4 uppercase letters)
 */
export function validateSchoolCode(code: string): boolean {
  const pattern = /^[A-Z]{3,4}$/;
  return pattern.test(code);
}

/**
 * Formats year as YY (last 2 digits)
 * Example: 2026 → '26', 2025 → '25'
 */
export function formatYear(year: number): string {
  return String(year).slice(-2);
}

/**
 * Pads a number with leading zeros
 * Example: padNumber(1, 4) → '0001'
 */
export function padNumber(num: number, length: number): string {
  return String(num).padStart(length, '0');
}

/**
 * Generates a unique register number
 * Format: YYSSSNNNN
 * 
 * @param admissionYear - Year of admission (e.g., 2026)
 * @param schoolCode - School code (e.g., 'SBPS')
 * @param sequenceNumber - Sequential number (e.g., 1)
 * @returns Generated register number (e.g., '26SBPS0001')
 */
export function generateRegisterNumber(
  admissionYear: number,
  schoolCode: string,
  sequenceNumber: number
): string {
  // Validate inputs
  if (!validateSchoolCode(schoolCode)) {
    throw new Error(`Invalid school code: ${schoolCode}. Must be 3 uppercase letters.`);
  }

  if (admissionYear < 2000 || admissionYear > 2099) {
    throw new Error(`Invalid admission year: ${admissionYear}. Must be between 2000 and 2099.`);
  }

  if (sequenceNumber < 1 || sequenceNumber > registerConfig.MAX_SEQUENCE) {
    throw new Error(`Sequence number out of range: ${sequenceNumber}. Must be between 1 and ${registerConfig.MAX_SEQUENCE}.`);
  }

  const yy = formatYear(admissionYear);
  const sss = schoolCode;
  const nnnn = padNumber(sequenceNumber, registerConfig.SEQUENCE_PAD);

  return `${yy}${sss}${nnnn}`;
}

/**
 * Parses an existing register number to extract components
 * 
 * @param registerNo - Register number string (e.g., '26SBPS0001')
 * @returns Object with year, schoolCode, and sequence
 */
export function parseRegisterNumber(registerNo: string): {
  year: number;
  schoolCode: string;
  sequence: number;
  isValid: boolean;
} {
  const pattern = /^(\d{2})([A-Z]{3,4})(\d{4})$/;
  const match = registerNo.match(pattern);

  if (!match) {
    return { year: 0, schoolCode: '', sequence: 0, isValid: false };
  }

  const yy = parseInt(match[1], 10);
  // Convert YY to YYYY (assuming 2000-2099 range)
  const year = yy <= 99 ? 2000 + yy : yy;
  const schoolCode = match[2];
  const sequence = parseInt(match[3], 10);

  return { year, schoolCode, sequence, isValid: true };
}

/**
 * Validates a register number format
 */
export function isValidRegisterNumber(registerNo: string): boolean {
  // Format: YYSSSNNNN (e.g., 26SBPS0001)
  // YY = 2 digits, SSS/SSSS = 3-4 letters, NNNN = 4 digits
  const isValid = /^(\d{2})([A-Z]{3,4})(\d{4})$/.test(registerNo);
  console.log(`✔️ Validating register number '${registerNo}': ${isValid}`);
  return isValid;
}

// getOrCreateSequence removed — generation now uses API endpoints directly

/**
 * Generates next unique register number
 * 
 * @param admissionYear - Admission year (e.g., 2026)
 * @param schoolCode - School code (e.g., 'SBPS')
 * @returns Generated register number
 */
export async function generateNextRegisterNumber(
  admissionYear: number = new Date().getFullYear(),
  schoolCode: string = registerConfig.SCHOOL_CODE
): Promise<string> {
  try {
    console.log(`🔍 === STARTING REGISTER NUMBER GENERATION ===`);
    console.log(`📅 Year: ${admissionYear}, School Code: ${schoolCode}`);
    
    // Validate inputs
    if (!validateSchoolCode(schoolCode)) {
      const err = `Invalid school code: ${schoolCode}`;
      console.error(`❌ ${err}`);
      throw new Error(err);
    }

    const result = await apiRequest<{ register_no: string }>(`/register-numbers/next`, {
      method: 'POST',
      body: JSON.stringify({ admissionYear, schoolCode }),
    });

    if (!result.success || !result.data?.register_no) {
      throw new Error(result.error || 'Failed to generate register number');
    }

    const registerNo = result.data.register_no;
    console.log(`✅ === REGISTER NUMBER GENERATED: ${registerNo} ===`);
    return registerNo;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error));
    console.error(`❌ === ERROR IN GENERATION ===`);
    console.error(errorMsg);
    throw new Error(`Register number generation failed: ${errorMsg}`);
  }
}

/**
 * Gets current sequence number for a given year/school
 */
export async function getCurrentSequence(
  admissionYear: number,
  schoolCode: string = registerConfig.SCHOOL_CODE
): Promise<number> {
  try {
    const result = await apiRequest<{ current_sequence: number }>(`/register-numbers/current?year=${admissionYear}&schoolCode=${encodeURIComponent(schoolCode)}`);
    return result.success && result.data ? result.data.current_sequence : 0;
  } catch (error) {
    console.error('Error getting current sequence:', error);
    return 0;
  }
}

/**
 * Resets sequence for new admission year (admin only)
 * Use when starting a new academic year
 */
export async function resetSequenceForYear(
  admissionYear: number,
  schoolCode: string = registerConfig.SCHOOL_CODE
): Promise<boolean> {
  try {
    const result = await apiRequest('/register-numbers/reset', {
      method: 'POST',
      body: JSON.stringify({ admissionYear, schoolCode }),
    });

    if (!result.success) throw new Error(result.error || 'Failed to reset sequence');

    console.log(`Sequence reset for year ${admissionYear} at ${schoolCode}`);
    return true;
  } catch (error) {
    console.error('Error resetting sequence:', error);
    return false;
  }
}

/**
 * Checks if a register number already exists
 */
export async function doesRegisterNumberExist(registerNo: string): Promise<boolean> {
  try {
    const result = await apiRequest<{ exists: boolean }>(`/register-numbers/exist?registerNo=${encodeURIComponent(registerNo)}`);
    return !!(result.success && result.data?.exists);
  } catch (error) {
    console.error('Error checking register number:', error);
    return false;
  }
}

/**
 * Batch generates multiple register numbers
 * Useful for bulk student imports
 */
export async function generateBatchRegisterNumbers(
  count: number,
  admissionYear: number = new Date().getFullYear(),
  schoolCode: string = registerConfig.SCHOOL_CODE
): Promise<string[]> {
  try {
    const registerNumbers: string[] = [];

    for (let i = 0; i < count; i++) {
      const regNo = await generateNextRegisterNumber(admissionYear, schoolCode);
      registerNumbers.push(regNo);
    }

    return registerNumbers;
  } catch (error) {
    console.error('Error generating batch register numbers:', error);
    throw error;
  }
}

/**
 * Gets all register numbers for a specific year
 */
export async function getRegisterNumbersByYear(
  admissionYear: number,
  schoolCode: string = registerConfig.SCHOOL_CODE
): Promise<string[]> {
  try {
    const result = await apiRequest<string[]>(`/register-numbers/year/${admissionYear}?schoolCode=${encodeURIComponent(schoolCode)}`);
    return result.success && result.data ? result.data : [];
  } catch (error) {
    console.error('Error getting register numbers by year:', error);
    return [];
  }
}

/**
 * Generates statistics for register numbers
 */
export async function getRegisterNumberStats(
  admissionYear?: number,
  schoolCode: string = registerConfig.SCHOOL_CODE
): Promise<{
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  transferredStudents: number;
  startRegisterNo: string;
  endRegisterNo: string;
}> {
  try {
    const year = admissionYear || new Date().getFullYear();
    const result = await apiRequest<any>(`/register-numbers/stats?year=${year}&schoolCode=${encodeURIComponent(schoolCode)}`);
    if (!result.success || !result.data) throw new Error(result.error || 'Error fetching statistics');
    return result.data;
  } catch (error) {
    console.error('Error generating statistics:', error);
    throw error;
  }
}

// getOrCreateTeacherSequence removed — use API endpoints directly

/**
 * Generates next unique teacher register number
 * Format: TEA{SCHOOL_CODE}{SEQUENCE}
 * Example: TEASBPS0001
 * 
 * @param schoolCode - School code (e.g., 'SBPS')
 * @returns Generated teacher register number
 */
export async function generateNextTeacherRegisterNumber(
  schoolCode: string = 'SBPS'
): Promise<string> {
  try {
    console.log(`🔍 === STARTING TEACHER REGISTER NUMBER GENERATION ===`);
    console.log(`🏫 School Code: ${schoolCode}`);
    
    // Validate school code (must be 4 letters for teacher format: TEA + 4-letter code)
    if (!/^[A-Z]{4}$/.test(schoolCode)) {
      const err = `Invalid school code for teacher: ${schoolCode}. Must be exactly 4 uppercase letters.`;
      console.error(`❌ ${err}`);
      throw new Error(err);
    }

    const result = await apiRequest<{ register_no: string }>(`/register-numbers/teacher/next?schoolCode=${encodeURIComponent(schoolCode)}`);
    if (!result.success || !result.data?.register_no) {
      throw new Error(result.error || 'Failed to generate teacher register number');
    }
    const teacherRegisterNo = result.data.register_no;
    console.log(`✅ === TEACHER REGISTER NUMBER GENERATED: ${teacherRegisterNo} ===`);
    return teacherRegisterNo;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error));
    console.error(`❌ === ERROR IN TEACHER GENERATION ===`);
    console.error(errorMsg);
    throw new Error(`Teacher register number generation failed: ${errorMsg}`);
  }
}

export default {
  validateSchoolCode,
  formatYear,
  padNumber,
  generateRegisterNumber,
  parseRegisterNumber,
  isValidRegisterNumber,
  generateNextRegisterNumber,
  generateNextTeacherRegisterNumber,
  getCurrentSequence,
  resetSequenceForYear,
  doesRegisterNumberExist,
  generateBatchRegisterNumbers,
  getRegisterNumbersByYear,
  getRegisterNumberStats,
  registerConfig,
};
