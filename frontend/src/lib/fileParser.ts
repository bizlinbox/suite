import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedData {
  headers: string[];
  rows: string[][];
}

export interface FileParseResult {
  success: boolean;
  data?: ParsedData;
  error?: string;
}

/**
 * Parse CSV file client-side
 */
export async function parseCSV(file: File): Promise<FileParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const rows = results.data as string[][];
          const headers = rows[0].map((h) => String(h ?? ''));
          const dataRows = rows.slice(1).map((row) => row.map((cell) => String(cell ?? '')));
          resolve({
            success: true,
            data: {
              headers,
              rows: dataRows,
            },
          });
        } else {
          resolve({
            success: false,
            error: 'No data found in CSV file',
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      },
    });
  });
}

/**
 * Parse Excel file (XLS or XLSX) client-side
 */
export async function parseExcel(file: File): Promise<FileParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        if (jsonData && jsonData.length > 0) {
          const headers = jsonData[0].map((h) => String(h ?? ''));
          const dataRows = jsonData.slice(1).map((row) => row.map((cell) => String(cell ?? '')));
          resolve({
            success: true,
            data: {
              headers,
              rows: dataRows,
            },
          });
        } else {
          resolve({
            success: false,
            error: 'No data found in Excel file',
          });
        }
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to parse Excel file',
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file',
      });
    };
    
    reader.readAsBinaryString(file);
  });
}

/**
 * Parse file based on extension
 */
export async function parseFile(file: File): Promise<FileParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'csv':
      return parseCSV(file);
    case 'xls':
    case 'xlsx':
      return parseExcel(file);
    default:
      return {
        success: false,
        error: 'Unsupported file format. Please use CSV, XLS, or XLSX.',
      };
  }
}

/**
 * Convert parsed data to campaign recipients format
 */
export function convertToRecipients(
  data: ParsedData,
  phoneColumnIndex: number,
  nameColumnIndex: number | null,
  remarksColumnIndex: number | null,
  variableMapping: Record<number, string>
): Array<{ phone: string; name?: string; remarks?: string; variables: Record<string, string> }> {
  const recipients: Array<{ phone: string; name?: string; remarks?: string; variables: Record<string, string> }> = [];

  for (const row of data.rows) {
    const phone = String(row[phoneColumnIndex] ?? '').trim();
    if (!phone) continue;

    const variables: Record<string, string> = {};
    for (const [colIndex, varName] of Object.entries(variableMapping)) {
      const value = String(row[parseInt(colIndex)] ?? '').trim();
      variables[varName] = value;
    }

    const recipient: { phone: string; name?: string; remarks?: string; variables: Record<string, string> } = {
      phone,
      variables,
    };

    if (nameColumnIndex !== null) {
      const name = String(row[nameColumnIndex] ?? '').trim();
      if (name) recipient.name = name;
    }

    if (remarksColumnIndex !== null) {
      const remarks = String(row[remarksColumnIndex] ?? '').trim();
      if (remarks) recipient.remarks = remarks;
    }

    recipients.push(recipient);
  }

  return recipients;
}
