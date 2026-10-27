// Title prefixes come first in stored full names ("นายดนัย เทพชุมพล", "ด.ช.สมพงษ์ โสเพียร").
// Longer forms are listed before the shorter ones they start with (นางสาว before นาง).
const TITLE_PREFIX =
  /^(?:เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นางสาว|น\.ส\.|นาย|นาง|mrs\.?|mr\.?|ms\.?|miss)\s*/i;

// Thai leading vowels are written before the consonant they belong to, and
// vowel/tone marks sit on it; neither works as an initial on its own.
const NOT_AN_INITIAL = /[ะ-ฺเ-๎]/;

function firstLetter(word: string) {
  for (const char of word) if (!NOT_AN_INITIAL.test(char) && /\p{L}/u.test(char)) return char;
  return "";
}

/** Initials for an avatar: first letter of the first name and of the surname, without the title. */
export function nameInitials(fullName: string) {
  const trimmed = fullName.trim();
  const withoutTitle = trimmed.replace(TITLE_PREFIX, "").trim() || trimmed;
  const words = withoutTitle.split(/\s+/).filter(Boolean);
  const initials = [words[0], words.length > 1 ? words[words.length - 1] : ""]
    .map((word) => (word ? firstLetter(word) : ""))
    .join("");
  return initials.toUpperCase() || trimmed.slice(0, 1) || "?";
}
