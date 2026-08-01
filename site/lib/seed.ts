export const seedEvents = [
  { id: "evt-sarah", day: "Sat", date: "09", title: "Sarah's birthday dinner", time: "7:00 PM", person: "Sarah", state: "Ready to review", kind: "purchase" },
  { id: "evt-passport", day: "Tue", date: "12", title: "Passport renewal", time: "Deadline", person: "You", state: "Needs one answer", kind: "admin" },
  { id: "evt-dentist", day: "Fri", date: "15", title: "Dentist follow-up", time: "10:30 AM", person: "You", state: "Watching", kind: "calendar" },
] as const;
export const seedCandidates = [
  { id: "cand-tea", merchant: "Granville Tea Co.", title: "Jasmine tea tasting set", price: 4200, currency: "CAD", arrival: "Arrives Friday", reason: "Sarah mentioned jasmine tea twice this spring.", evidence: "Memory note · Apr 18" },
  { id: "cand-book", merchant: "Paper Hound", title: "The Art of Still Life", price: 3800, currency: "CAD", arrival: "Pickup today", reason: "Fits her ceramics class and avoids guessing a clothing size.", evidence: "Memory note · Jun 02" },
] as const;
export const seedAudit = [
  { time: "10:14", title: "Prepared two gift options", detail: "No live purchase attempted" },
  { time: "10:13", title: "Checked event deadline", detail: "Dinner is nine days away" },
  { time: "10:12", title: "Matched three memory facts", detail: "Relationship context" },
] as const;
