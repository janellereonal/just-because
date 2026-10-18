/** Guest placeholder addresses end here. `.invalid` can never receive mail (RFC 2606). */
export const GUEST_EMAIL_DOMAIN = "guest.justbecause.invalid";

export function isGuestEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`);
}
