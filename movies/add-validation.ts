export const MIN_YEAR = 1930;
export const MAX_POSTER_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_DESCRIPTION_LENGTH = 5000;

export interface MovieFields {
  title: string;
  director: string;
  releaseYear: string;
  description: string;
}

// Returns a list of error messages. An empty list means the text fields are valid.
export function validateFields(
  fields: MovieFields,
  currentYear = new Date().getFullYear(),
): string[] {
  const errors: string[] = [];

  if (!fields.title) errors.push("Enter the movie title.");
  else if (fields.title.length > 255) errors.push("The title must be 255 characters or fewer.");

  if (!fields.director) errors.push("Enter the director's name.");
  else if (fields.director.length > 255) {
    errors.push("The director's name must be 255 characters or fewer.");
  }

  const year = Number(fields.releaseYear);
  if (!/^\d{4}$/.test(fields.releaseYear) || year < MIN_YEAR || year > currentYear) {
    errors.push(`Choose a release year between ${MIN_YEAR} and ${currentYear}.`);
  }

  if (!fields.description) errors.push("Enter a description.");
  else if (fields.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`The description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`);
  }

  return errors;
}

// Checks the first bytes of the file, because the filename and browser type can be faked.
export function detectImageType(bytes: Uint8Array): "png" | "jpg" | "webp" | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  const text = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length >= 12 && text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "webp";
  return null;
}