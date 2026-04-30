export const CORE_TALENT_INDUSTRIES = ["Film Industry", "IT Consulting", "Hospital Staffing"] as const;
export const TALENT_INDUSTRIES = [...CORE_TALENT_INDUSTRIES, "Other"] as const;
export const COMPANY_TALENT_INDUSTRIES = CORE_TALENT_INDUSTRIES;
export const DEFAULT_COMPANY_TALENT_INDUSTRY = "IT Consulting" as const;
export const DEFAULT_TALENT_RESOURCE_TYPE = "All" as const;
export const OTHER_TALENT_OPTION = "Other" as const;

export type CoreTalentIndustry = (typeof CORE_TALENT_INDUSTRIES)[number];
export type TalentIndustry = (typeof TALENT_INDUSTRIES)[number];

export const TALENT_RESOURCE_GROUPS_BY_INDUSTRY: Record<CoreTalentIndustry, Array<{ heading: string; roles: string[] }>> = {
  "Film Industry": [
    {
      heading: "Production",
      roles: ["Producer", "Executive Producer", "Line Producer", "Production Manager", "Production Coordinator"],
    },
    { heading: "Creative", roles: ["Director", "Assistant Director", "Screenwriter", "Script Supervisor"] },
    {
      heading: "Camera, Lighting & Sound",
      roles: [
        "Cinematographer / DOP",
        "Camera Operator",
        "Focus Puller",
        "Gaffer",
        "Lighting Technician",
        "Sound Engineer",
        "Boom Operator",
      ],
    },
    {
      heading: "Art, Wardrobe & Post-production",
      roles: [
        "Production Designer",
        "Art Director",
        "Props Master",
        "Costume Designer",
        "Makeup Artist",
        "Video Editor",
        "Colorist",
        "VFX Artist",
        "Motion Graphics Designer",
      ],
    },
  ],
  "IT Consulting": [
    { heading: "Business & Analysis", roles: ["Business Analyst", "Business Process Analyst", "Data Analyst"] },
    { heading: "Architecture", roles: ["Solution Architect", "Enterprise Architect", "Technical Architect"] },
    { heading: "Delivery & Management", roles: ["Project Manager", "Programme Manager", "Scrum Master", "Product Owner"] },
    {
      heading: "Engineering & Systems",
      roles: ["Software Developer", "QA / Tester", "DevOps Engineer", "Integration Specialist", "API Developer", "Systems Engineer"],
    },
    {
      heading: "Platforms, Change & Adoption",
      roles: [
        "SAP Consultant",
        "Salesforce Consultant",
        "Microsoft Dynamics Consultant",
        "Change Manager",
        "Training Specialist",
        "Communications Specialist",
      ],
    },
  ],
  "Hospital Staffing": [
    { heading: "Nursing", roles: ["Registered Nurse", "Enrolled Nurse", "Nursing Assistant"] },
    { heading: "Specialist Nursing", roles: ["ICU Nurse", "Theatre Nurse", "Emergency Nurse", "Pediatric Nurse", "Maternity Nurse", "Oncology Nurse"] },
    { heading: "Support Staff", roles: ["Caregiver", "Healthcare Assistant"] },
    { heading: "Allied Health", roles: ["Physiotherapist", "Occupational Therapist", "Radiographer", "Pharmacist"] },
    { heading: "Doctors", roles: ["General Practitioner", "Specialist Doctor"] },
  ],
};

export function getTalentRolesForIndustry(industry: CoreTalentIndustry): string[] {
  return TALENT_RESOURCE_GROUPS_BY_INDUSTRY[industry].flatMap((group) => group.roles);
}

export function isCoreTalentIndustry(value: string | null | undefined): value is CoreTalentIndustry {
  return value === "Film Industry" || value === "IT Consulting" || value === "Hospital Staffing";
}

export function isTalentIndustry(value: string | null | undefined): value is TalentIndustry {
  return isCoreTalentIndustry(value) || value === "Other";
}
