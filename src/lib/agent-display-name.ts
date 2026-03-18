/**
 * Agent name masking — protects agent identities from being looked up online.
 *
 * Rules:
 * - Partners (direct network): full name ("Brent Schaefer")
 * - 1st/2nd degree with paid feature access: masked ("Brent S.")
 * - Everyone else / free plan: masked ("Brent S.")
 */

/** Mask a full name to "FirstName L." format */
export function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return fullName
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

/** Get the display name based on network relationship */
export function getDisplayName(
  fullName: string,
  opts: { isPartner: boolean }
): string {
  if (opts.isPartner) return fullName
  return maskName(fullName)
}
