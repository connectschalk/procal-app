/** Stand-in avatar choices backed by static image files in `/public/avatars`. */
export type TalentAvatarOption = {
  key: string;
  label: string;
  imagePath: string;
};

const LEGACY_KEYS_AND_LABELS = [
  ["technical_consultant", "Technical consultant"],
  ["developer", "Developer"],
  ["sap_specialist", "SAP specialist"],
  ["project_manager", "Project manager"],
  ["change_manager", "Change manager"],
  ["doctor", "Doctor"],
  ["nurse", "Nurse"],
  ["finance_specialist", "Finance specialist"],
  ["legal_advisor", "Legal advisor"],
  ["engineer", "Engineer"],
  ["creative_professional", "Creative professional"],
  ["teacher_trainer", "Teacher / trainer"],
  ["hr_specialist", "HR specialist"],
  ["operations_specialist", "Operations specialist"],
  ["data_analyst", "Data analyst"],
  ["executive_advisor", "Executive advisor"],
  ["customer_success", "Customer success"],
  ["product_manager", "Product manager"],
  ["scientist", "Scientist"],
  ["general_professional", "General professional"],
] as const;

const STAND_IN_AVATAR_FILES = [
  "default-onboarding-avatar.png",
  "FVHh8-e3e6f3f5-2356-4a81-a4f8-f61820c0d50f.png",
  "NFwuZ-d26e85a7-87ed-470a-8063-046b30392daf.png",
  "lbAgG-353c7877-7bcb-4568-bbfa-165b71ba3b0b.png",
  "kdK2X-e397c26b-fde4-4bd0-bced-360d461acedd.png",
  "cK2rZ-0c0dde4a-7b3a-4240-8f26-adea8cf7f49e.png",
  "X2HVi-cf4af1f8-a370-436d-ad15-8c58ac1d1480.png",
  "L3QM0-9ca81867-d4ba-4781-8083-5fb4ef271ab2.png",
  "jHopF-6135254f-4756-4525-88a2-d369c94b9b68.png",
  "EP5G5-1dacfc76-57de-4f2c-82d4-2e8a27d12191.png",
  "t5v6N-fead098a-f8fe-4df5-90b8-2a854f91e8d2.png",
  "RST4a-2c674157-8cd3-4650-accc-0fd5d0c6c4c0.png",
  "h7yOh-2be4d02f-e8b8-4eeb-aa11-488d47665a55.png",
  "OWgfp-572d5967-3ed1-48f3-ac35-2bad8f41d6de.png",
  "VvQBF-a44cb3f6-3483-4ee3-82cc-ce4e73e15ef8.png",
  "Ia20E-116d6711-b1ce-4464-bf7a-4dff37dd0b62.png",
  "q9YuL-f865a667-c46e-48f3-b6dc-78a38a3c5a88.png",
  "XDxOd-4d7e0555-c2e8-45f3-b1a9-8c4f66f936b1.png",
  "Hqtib-ec4b0a99-a7e0-4561-92ae-3bcbd1a7844f.png",
  "wuugA-ab23dea9-fc13-4183-816b-d50bce70ffbc.png",
  "i7ivP-16df0c23-938b-414d-a84e-70dd3d5e9534.png",
  "gW0Nq-0b72881a-8bac-4941-b074-8265e1cd4fb3.png",
  "wdc1I-fc528e18-16dc-4624-a0e9-71f46171bf49.png",
  "tDhlG-a7d0d1af-5b6f-4442-b7bf-42618e90fce0.png",
  "4pSwQ-585afeab-96da-42f5-b262-537023ef39ac.png",
  "C5MsQ-c423e333-3266-4105-bb86-57b0834770da.png",
  "nDyLJ-3d138a9c-7a1f-4958-b679-494a039fca2f.png",
  "i8Qn3-c2b245bf-1b78-46d0-b1e8-13ec619eebc1.png",
  "mn3Fp-6fd2eb83-3759-4a1a-b980-6e238e7b46f0.png",
  "eXgFc-35afd65a-456d-4a71-9baa-c0ab6db69150.png",
  "xfseS-77415a55-8334-4375-a31b-40811be9dce6.png",
  "vKZYA-13a83985-41ec-4631-9aaa-45134e89f6cc.png",
  "vxP5O-fb00bb2a-da0b-46a2-b80f-b8603822e575.png",
  "MMibG-43c53d0b-0e67-44d6-a404-42529371cee4.png",
  "Xwvxx-2403fbb2-cb0d-4963-a7ab-1a304381bc22.png",
  "03hmP-78c1191c-19f0-4e2b-ba2e-9f679fa59be9.png",
  "SG092-937f65c6-3cd9-498c-8314-029fddf1f7ad.png",
  "H3Ax6-c3ee85b4-2ea8-4775-bcec-74d405207afa.png",
  "2vu3n-c9fc7dbd-617f-4275-a393-f8920b4d44e9.png",
  "FghU0-38fdffa5-122b-4612-8154-405f424dd060.png",
  "yt5yx-cdee88d2-c3c0-4de9-a8d2-f97aaa348a90.png",
  "cuSzR-ec685008-3380-4347-9975-54b70d1536c1.png",
  "eIY3J-29246161-1cd1-4a69-b3d2-0b322d3c674b.png",
  "3Un0J-0113e3a9-eacc-4dbe-9780-e9c2a613c05a.png",
  "YCs8R-19328f26-ef27-4418-a8d9-ddd2e8466f48.png",
  "57vqf-be7f782d-3968-437e-8b08-9466b4923f7b.png",
  "8R7jO-7c251000-d160-4436-847f-0506287ff6f7.png",
  "qMyo5-e3f41e07-3a00-4f20-9553-1d0b0f6446c4.png",
  "gtFid-b80ac85e-855d-4f3e-8fee-b61ace3377c4.png",
] as const;

export const TALENT_AVATAR_OPTIONS: TalentAvatarOption[] = STAND_IN_AVATAR_FILES.map((file, i) => {
  const legacy = LEGACY_KEYS_AND_LABELS[i];
  return {
    key: legacy?.[0] ?? `stand_in_avatar_${i + 1}`,
    label: legacy?.[1] ?? `Stand-in avatar ${i + 1}`,
    imagePath: `/avatars/${file}`,
  };
});

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
  imagePath: null;
  primary: string;
  secondary: string;
  label: string;
} {
  if (heuristic === "technical") {
    return { imagePath: null, primary: "🧱", secondary: "💻", label: "Technical style" };
  }
  if (heuristic === "healthcare") {
    return { imagePath: null, primary: "🧱", secondary: "🩺", label: "Healthcare style" };
  }
  return { imagePath: null, primary: "🧱", secondary: "💼", label: "Professional style" };
}

/** Public profile: prefer saved avatar_key; else headline/bio heuristic. */
export function getPublicTalentAvatarDisplay(
  avatarKey: string | null | undefined,
  headline: string | null,
  bio: string | null,
): { imagePath: string | null; primary: string; secondary: string; label: string } {
  const opt = getTalentAvatarOptionByKey(avatarKey);
  if (opt != null) {
    return {
      imagePath: opt.imagePath,
      primary: "🧱",
      secondary: "💼",
      label: opt.label,
    };
  }
  return heuristicAvatarEmojis(talentAvatarHeuristic(headline, bio));
}
