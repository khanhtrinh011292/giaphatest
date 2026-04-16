import { Person, Relationship } from "@/types";

interface PersonDetailsPrivateRow {
  person_id: string;
  phone_number: string | null;
  occupation: string | null;
  current_residence: string | null;
}

interface CustomEventRow {
  id: string;
  name: string;
  content: string | null;
  event_date: string;
  location: string | null;
  created_by: string | null;
}

function sanitizeExcelPerson(row: Record<string, unknown>): Partial<Person> {
  const numericFields = [
    "birth_year", "birth_month", "birth_day",
    "death_year", "death_month", "death_day",
    "death_lunar_year", "death_lunar_month", "death_lunar_day",
    "birth_order", "generation",
  ];
  const boolFields = ["is_deceased", "is_in_law"];
  const nullableStringFields = ["other_names", "avatar_url", "note"];

  const result: Record<string, unknown> = { ...row };

  for (const f of numericFields) {
    if (result[f] === "" || result[f] === null || result[f] === undefined) {
      result[f] = null;
    } else {
      const n = Number(result[f]);
      result[f] = isNaN(n) ? null : n;
    }
  }

  for (const f of boolFields) {
    const v = result[f];
    if (v === true || v === "TRUE" || v === "true" || v === 1 || v === "1") result[f] = true;
    else result[f] = false;
  }

  for (const f of nullableStringFields) {
    if (result[f] === "" || result[f] === undefined) result[f] = null;
  }

  return result as Partial<Person>;
}

export async function exportToExcel(data: {
  persons: Partial<Person>[];
  relationships: Partial<Relationship>[];
  person_details_private?: PersonDetailsPrivateRow[];
  custom_events?: CustomEventRow[];
}): Promise<Blob> {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  const wsPersons = XLSX.utils.json_to_sheet(data.persons);
  XLSX.utils.book_append_sheet(wb, wsPersons, "Thành viên");

  const wsRels = XLSX.utils.json_to_sheet(data.relationships);
  XLSX.utils.book_append_sheet(wb, wsRels, "Quan hệ");

  if (data.person_details_private && data.person_details_private.length > 0) {
    const wsPrivate = XLSX.utils.json_to_sheet(data.person_details_private);
    XLSX.utils.book_append_sheet(wb, wsPrivate, "Thông tin riêng tư");
  }

  if (data.custom_events && data.custom_events.length > 0) {
    const wsEvents = XLSX.utils.json_to_sheet(data.custom_events);
    XLSX.utils.book_append_sheet(wb, wsEvents, "Sự kiện");
  }

  const wbArray = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbArray], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function parseExcel(file: File): Promise<{
  persons: Partial<Person>[];
  relationships: Partial<Relationship>[];
  person_details_private?: PersonDetailsPrivateRow[];
  custom_events?: CustomEventRow[];
}> {
  const XLSX = await import("xlsx");

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });

  // Sheet "Thành viên" hoặc fallback sang sheet đầu tiên
  const personsSheetName =
    wb.SheetNames.find((n) => n === "Thành viên") ?? wb.SheetNames[0];
  const relsSheetName =
    wb.SheetNames.find((n) => n === "Quan hệ") ?? wb.SheetNames[1];

  if (!personsSheetName || !relsSheetName) {
    throw new Error(
      "File Excel không hợp lệ: thiếu sheet 'Thành viên' hoặc 'Quan hệ'.",
    );
  }

  const personsRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets[personsSheetName],
    { defval: null },
  );
  const relsRaw = XLSX.utils.sheet_to_json<Partial<Relationship>>(
    wb.Sheets[relsSheetName],
    { defval: null },
  );

  const persons = personsRaw.map((row) => sanitizeExcelPerson(row));

  const result: {
    persons: Partial<Person>[];
    relationships: Partial<Relationship>[];
    person_details_private?: PersonDetailsPrivateRow[];
    custom_events?: CustomEventRow[];
  } = { persons, relationships: relsRaw };

  const privateSheetName = wb.SheetNames.find((n) => n === "Thông tin riêng tư");
  if (privateSheetName) {
    const privateRaw = XLSX.utils.sheet_to_json<PersonDetailsPrivateRow>(
      wb.Sheets[privateSheetName],
      { defval: null },
    );
    result.person_details_private = privateRaw.map((row) => ({
      person_id: row.person_id,
      phone_number: row.phone_number || null,
      occupation: row.occupation || null,
      current_residence: row.current_residence || null,
    }));
  }

  const eventsSheetName = wb.SheetNames.find((n) => n === "Sự kiện");
  if (eventsSheetName) {
    const eventsRaw = XLSX.utils.sheet_to_json<CustomEventRow>(
      wb.Sheets[eventsSheetName],
      { defval: null },
    );
    result.custom_events = eventsRaw.map((row) => ({
      id: row.id,
      name: row.name,
      content: row.content || null,
      event_date: row.event_date,
      location: row.location || null,
      created_by: null,
    }));
  }

  return result;
}
