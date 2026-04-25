/**
 * Built-in public avatar options (Lego/toy-style placeholders via emoji).
 * TODO: Replace emoji cards with static generated images or sprite paths, e.g. `/avatars/${key}.png`.
 */
export type TalentAvatarOption = {
  key: string;
  label: string;
  /** Primary emoji shown large */
  emojiPrimary: string;
  /** Secondary emoji shown smaller */
  emojiSecondary: string;
};

export const TALENT_AVATAR_OPTIONS: TalentAvatarOption[] = [
  { key: "technical_consultant", label: "Technical consultant", emojiPrimary: "🧱", emojiSecondary: "💼" },
  { key: "developer", label: "Developer", emojiPrimary: "🧱", emojiSecondary: "💻" },
  { key: "sap_specialist", label: "SAP specialist", emojiPrimary: "🧱", emojiSecondary: "📊" },
  { key: "project_manager", label: "Project manager", emojiPrimary: "🧱", emojiSecondary: "📋" },
  { key: "change_manager", label: "Change manager", emojiPrimary: "🧱", emojiSecondary: "🔄" },
  { key: "doctor", label: "Doctor", emojiPrimary: "🧱", emojiSecondary: "🩺" },
  { key: "nurse", label: "Nurse", emojiPrimary: "🧱", emojiSecondary: "💉" },
  { key: "finance_specialist", label: "Finance specialist", emojiPrimary: "🧱", emojiSecondary: "📈" },
  { key: "legal_advisor", label: "Legal advisor", emojiPrimary: "🧱", emojiSecondary: "⚖️" },
  { key: "engineer", label: "Engineer", emojiPrimary: "🧱", emojiSecondary: "⚙️" },
  { key: "creative_professional", label: "Creative professional", emojiPrimary: "🧱", emojiSecondary: "🎨" },
  { key: "teacher_trainer", label: "Teacher / trainer", emojiPrimary: "🧱", emojiSecondary: "📚" },
  { key: "hr_specialist", label: "HR specialist", emojiPrimary: "🧱", emojiSecondary: "🤝" },
  { key: "operations_specialist", label: "Operations specialist", emojiPrimary: "🧱", emojiSecondary: "🏭" },
  { key: "data_analyst", label: "Data analyst", emojiPrimary: "🧱", emojiSecondary: "📉" },
  { key: "executive_advisor", label: "Executive advisor", emojiPrimary: "🧱", emojiSecondary: "🎯" },
  { key: "customer_success", label: "Customer success", emojiPrimary: "🧱", emojiSecondary: "✨" },
  { key: "product_manager", label: "Product manager", emojiPrimary: "🧱", emojiSecondary: "🛠️" },
  { key: "scientist", label: "Scientist", emojiPrimary: "🧱", emojiSecondary: "🔬" },
  { key: "general_professional", label: "General professional", emojiPrimary: "🧱", emojiSecondary: "👔" },
];

const KEY_SET = new Set(TALENT_AVATAR_OPTIONS.map((o) => o.key));

export function isValidTalentAvatarKey(key: unknown): key is string {
  return typeof key === "string" && KEY_SET.has(key);
}

export function getTalentAvatarOptionByKey(key: string | null | undefined): TalentAvatarOption | null {
  if (key == null || key.trim() === "") return null;
  return TALENT_AVATAR_OPTIONS.find((o) => o.key === key) ?? null;
}

export type TalentAvatarHeuristic = "technical" | "healthcare" | "general";

/** When avatar_key is unset, infer a default emoji pair from headline + bio (same rules as legacy public profile). */
export function talentAvatarHeuristic(headline: string | null, bio: string | null): TalentAvatarHeuristic {
  const h = `${headline ?? ""} ${bio ?? ""}`.toLowerCase();
  if (
    /(doctor|nurse|medical|healthcare|health|clinic|hospital|pharma|patient|physician|surgeon|dentist)/.test(h)
  ) {
    return "healthcare";
  }
  if (
    /(developer|engineer|technical|sap\b|\bit\b|software|code|devops|data scientist|programmer|architect|fullstack|full-stack|frontend|backend|cloud|aws|azure|kubernetes|\.net|java|python|typescript|javascript)/.test(
      h,
    )
  ) {
    return "technical";
  }
  return "general";
}

export function heuristicAvatarEmojis(heuristic: TalentAvatarHeuristic): {
  primary: string;
  secondary: string;
  label: string;
} {
  if (heuristic === "technical") {
    return { primary: "🧱", secondary: "💻", label: "Technical style" };
  }
  if (heuristic === "healthcare") {
    return { primary: "🧱", secondary: "🩺", label: "Healthcare style" };
  }
  return { primary: "🧱", secondary: "💼", label: "Professional style" };
}

/** Public profile: prefer saved avatar_key; else headline/bio heuristic. */
export function getPublicTalentAvatarDisplay(
  avatarKey: string | null | undefined,
  headline: string | null,
  bio: string | null,
): { primary: string; secondary: string; label: string } {
  const opt = getTalentAvatarOptionByKey(avatarKey);
  if (opt != null) {
    return { primary: opt.emojiPrimary, secondary: opt.emojiSecondary, label: opt.label };
  }
  return heuristicAvatarEmojis(talentAvatarHeuristic(headline, bio));
}
