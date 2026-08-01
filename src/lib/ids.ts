import { randomBytes } from "crypto";

export function shareSlug(length = 10) {
  return randomBytes(length)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, length);
}
