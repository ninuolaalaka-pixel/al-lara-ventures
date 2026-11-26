// Small helpers shared by the contact and booking forms.
// This file starts with "_" so Vercel does NOT publish it as a web address.

// Makes text safe to put inside an HTML email (stops injected links, images and scripts)
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Same, and also keeps the line breaks the person typed
export function escapeHtmlWithBreaks(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

// Only real text counts. Numbers, objects and lists become "" so they fail validation
export function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(email);
}

// Digits only, 7 to 15 of them (same rule as the forms)
export function isValidPhone(phone) {
  return /^\d{7,15}$/.test(phone);
}