export type CsvValue = boolean | null | number | string | undefined;

export type CsvCell = CsvValue | CsvRow;

export type CsvRow = {
  [key: string]: CsvCell;
};

export function rowsToCsv(rows: CsvRow[]) {
  const flatRows = rows.map((row) => flattenRow(row));
  const headers = [...new Set(flatRows.flatMap((row) => Object.keys(row)))].sort();

  return [
    headers.join(","),
    ...flatRows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

export function csvEscape(value: CsvValue) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function flattenRow(row: CsvRow, prefix = ""): Record<string, CsvValue> {
  return Object.entries(row).reduce<Record<string, CsvValue>>((flat, [key, value]) => {
    const column = prefix ? `${prefix}_${key}` : key;

    if (isPlainObject(value)) {
      return { ...flat, ...flattenRow(value, column) };
    }

    flat[column] = value;
    return flat;
  }, {});
}

function isPlainObject(value: CsvCell): value is CsvRow {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
