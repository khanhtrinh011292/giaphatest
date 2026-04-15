import { Person, Relationship } from "@/types";
import JSZip from "jszip";
import Papa from "papaparse";

const UTF8_BOM = "\uFEFF";

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

// Convert empty string fields to null after PapaParse
function sanitizeCsvPerson(row: Record<string, unknown>): Partial<Person> {
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
    if (v === true || v === "true" || v === 1 || v === "1") result[f] = true;
    else result[f] = false;
  }

  for (const f of nullableStringFields) {
    if (result[f] === "" || result[f] === undefined) result[f] = null;
  }

  return result as Partial<Person>;
}

export async function exportToCsvZip(data: {
  persons: Partial<Person>[];
  relationships: Partial<Relationship>[];
  person_details_private?: PersonDetailsPrivateRow[];
  custom_events?: CustomEventRow[];
}): Promise<Blob> {
  const personsCsv = UTF8_BOM + Papa.unparse(data.persons);
  const relationshipsCsv = UTF8_BOM + Papa.unparse(data.relationships);

  const zip = new JSZip();
  zip.file("persons.csv", personsCsv);
  zip.file("relationships.csv", relationshipsCsv);

  if (data.person_details_private && data.person_details_private.length > 0) {
    zip.file(
      "person_details_private.csv",
      UTF8_BOM + Papa.unparse(data.person_details_private),
    );
  }

  if (data.custom_events && data.custom_events.length > 0) {
    zip.file("custom_events.csv", UTF8_BOM + Papa.unparse(data.custom_events));
  }

  return await zip.generateAsync({ type: "blob" });
}

export async function parseCsvZip(zipBlob: Blob): Promise<{
  persons: Partial<Person>[];
  relationships: Partial<Relationship>[];
  person_details_private?: PersonDetailsPrivateRow[];
  custom_events?: CustomEventRow[];
}> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipBlob);

  const personsFile = loadedZip.file("persons.csv");
  const relationshipsFile = loadedZip.file("relationships.csv");

  if (!personsFile || !relationshipsFile) {
    throw new Error(
      "File ZIP không hợp lệ: thiếu persons.csv hoặc relationships.csv.",
    );
  }

  const personsCsvRaw = await personsFile.async("text");
  const relationshipsCsvRaw = await relationshipsFile.async("text");

  const personsCsvStr = personsCsvRaw.startsWith(UTF8_BOM)
    ? personsCsvRaw.slice(1)
    : personsCsvRaw;
  const relationshipsCsvStr = relationshipsCsvRaw.startsWith(UTF8_BOM)
    ? relationshipsCsvRaw.slice(1)
    : relationshipsCsvRaw;

  const personsParsed = Papa.parse<Record<string, unknown>>(personsCsvStr, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // Disable để sanitize thủ công, tránh lỗi type
  });

  const relationshipsParsed = Papa.parse<Partial<Relationship>>(
    relationshipsCsvStr,
    {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    },
  );

  if (personsParsed.errors.length > 0) {
    console.error("Lỗi parse persons.csv:", personsParsed.errors);
  }

  if (relationshipsParsed.errors.length > 0) {
    console.error("Lỗi parse relationships.csv:", relationshipsParsed.errors);
  }

  const persons = personsParsed.data.map((row) => sanitizeCsvPerson(row));

  const result: {
    persons: Partial<Person>[];
    relationships: Partial<Relationship>[];
    person_details_private?: PersonDetailsPrivateRow[];
    custom_events?: CustomEventRow[];
  } = {
    persons,
    relationships: relationshipsParsed.data,
  };

  // Parse person_details_private.csv (optional, backward compat)
  const privateFile = loadedZip.file("person_details_private.csv");
  if (privateFile) {
    const raw = await privateFile.async("text");
    const privateCsvStr = raw.startsWith(UTF8_BOM) ? raw.slice(1) : raw;
    const privateParsed = Papa.parse<PersonDetailsPrivateRow>(privateCsvStr, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });
    if (privateParsed.errors.length > 0) {
      console.error(
        "Lỗi parse person_details_private.csv:",
        privateParsed.errors,
      );
    }
    result.person_details_private = privateParsed.data.map((row) => ({
      person_id: row.person_id,
      phone_number: (row.phone_number as unknown as string) || null,
      occupation: (row.occupation as unknown as string) || null,
      current_residence: (row.current_residence as unknown as string) || null,
    }));
  }

  // Parse custom_events.csv (optional, backward compat)
  const eventsFile = loadedZip.file("custom_events.csv");
  if (eventsFile) {
    const raw = await eventsFile.async("text");
    const eventsCsvStr = raw.startsWith(UTF8_BOM) ? raw.slice(1) : raw;
    const eventsParsed = Papa.parse<CustomEventRow>(eventsCsvStr, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });
    if (eventsParsed.errors.length > 0) {
      console.error("Lỗi parse custom_events.csv:", eventsParsed.errors);
    }
    result.custom_events = eventsParsed.data.map((row) => ({
      id: row.id,
      name: row.name,
      content: (row.content as unknown as string) || null,
      event_date: row.event_date,
      location: (row.location as unknown as string) || null,
      created_by: null,
    }));
  }

  return result;
}
