/**
 * Profile validation.
 *
 * Returns a field -> message map so the caller can place each error next
 * to its input. An empty object means valid.
 */

export const MIN_AGE = 18;
export const MAX_AGE = 120;
export const BIO_MAX = 500;
export const NAME_MAX = 40;

export function validatePublicProfile(profile = {}) {
  const errors = {};

  const displayName = String(profile.displayName ?? "").trim();
  if (!displayName) errors.displayName = "Pick a name people will see.";
  else if (displayName.length > NAME_MAX) {
    errors.displayName = `Keep this under ${NAME_MAX} characters.`;
  }

  const age = Number(profile.age);
  if (!profile.age && profile.age !== 0) errors.age = "Add your age.";
  else if (!Number.isInteger(age)) errors.age = "Age must be a whole number.";
  else if (age < MIN_AGE) errors.age = `You must be ${MIN_AGE} or over to use Elyra.`;
  else if (age > MAX_AGE) errors.age = "Enter a real age.";

  if (!String(profile.city ?? "").trim()) errors.city = "Add your city.";

  if (!profile.intent) errors.intent = "Choose what you're here for.";

  if (String(profile.bio ?? "").length > BIO_MAX) {
    errors.bio = `Bio is limited to ${BIO_MAX} characters.`;
  }

  if (Array.isArray(profile.interests) && profile.interests.length > 12) {
    errors.interests = "Pick up to 12 interests.";
  }

  return errors;
}

export const isValid = (errors) => Object.keys(errors).length === 0;

export function validateTrustedContact(contact = {}) {
  const errors = {};
  if (!String(contact.name ?? "").trim()) errors.name = "Add a name.";
  // Deliberately permissive: international formats vary, and rejecting a
  // real number is worse here than accepting an odd one.
  const phone = String(contact.phone ?? "").trim();
  if (!phone) errors.phone = "Add a phone number.";
  else if (!/^[+\d][\d\s()-]{5,20}$/.test(phone)) errors.phone = "That doesn't look like a phone number.";
  return errors;
}
