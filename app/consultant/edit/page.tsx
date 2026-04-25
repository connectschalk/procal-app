"use client";

import { AppTopNav } from "@/components/app-top-nav";
import {
  getTalentAvatarOptionByKey,
  TALENT_AVATAR_OPTIONS,
  type TalentAvatarOption,
} from "@/lib/talent-avatar-library";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

const ACCENT = "#ff6a00";

const glassCard =
  "rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/25 backdrop-blur-md md:p-8";
const accentEyebrow =
  "text-[10px] font-semibold uppercase tracking-widest text-[#ff6a00] md:text-[11px]";
const inputClass =
  "min-w-0 rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/20 outline-none transition placeholder:text-zinc-500 focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/25";

type TalentDocType = "cv" | "id_front" | "id_back";

function AvatarCirclePreview({ option, selected }: { option: TalentAvatarOption; selected: boolean }) {
  return (
    <div
      className={`flex h-[88px] w-[88px] flex-col items-center justify-center gap-0.5 rounded-full border bg-gradient-to-br from-zinc-600/80 via-zinc-800 to-zinc-950 shadow-inner transition ${
        selected
          ? "border-orange-500 ring-2 ring-orange-500/40"
          : "border-white/10 hover:border-white/20"
      }`}
      title={option.label}
    >
      <span className="select-none text-2xl leading-none">{option.emojiPrimary}</span>
      <span className="select-none text-base leading-none">{option.emojiSecondary}</span>
    </div>
  );
}

function OnboardingChecklistRow({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-white/80">
      <span className={done ? "mt-0.5 text-emerald-400" : "mt-0.5 text-amber-200"} aria-hidden>
        {done ? "✓" : "○"}
      </span>
      <span>{children}</span>
    </li>
  );
}

function PublicAvatarPreviewLarge({ option }: { option: TalentAvatarOption | null }) {
  if (option == null) {
    return (
      <div
        className="flex h-[120px] w-[120px] flex-col items-center justify-center gap-0.5 rounded-full border border-dashed border-white/20 bg-black/30 text-xs text-white/45 md:h-[140px] md:w-[140px]"
        title="Choose public avatar"
      >
        Choose avatar
      </div>
    );
  }
  return (
    <div
      className="flex h-[120px] w-[120px] flex-col items-center justify-center gap-0.5 rounded-full border border-white/10 bg-gradient-to-br from-zinc-600/80 via-zinc-800 to-zinc-950 shadow-inner md:h-[140px] md:w-[140px]"
      title={option.label}
    >
      <span className="select-none text-[2.5rem] leading-none md:text-[2.85rem]">{option.emojiPrimary}</span>
      <span className="select-none text-[1.2rem] leading-none md:text-[1.35rem]">{option.emojiSecondary}</span>
    </div>
  );
}

export default function ConsultantEditProfilePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [dashboardEmail, setDashboardEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [ambiguous, setAmbiguous] = useState(false);
  const [notClaimed, setNotClaimed] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [location, setLocation] = useState("");
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const [profilePhotoPath, setProfilePhotoPath] = useState<string | null>(null);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [cvPath, setCvPath] = useState<string | null>(null);
  const [idFrontPath, setIdFrontPath] = useState<string | null>(null);
  const [idBackPath, setIdBackPath] = useState<string | null>(null);
  const [availableFrom, setAvailableFrom] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState<TalentDocType | null>(null);

  const selectedAvatarOption = useMemo(() => getTalentAvatarOptionByKey(avatarKey), [avatarKey]);

  const { onboardingIncomplete, documentsIncomplete, checklist } = useMemo(() => {
    const profileDetailsComplete =
      name.trim().length > 0 && headline.trim().length > 0 && bio.trim().length > 0;
    const publicAvatarComplete = Boolean(avatarKey && avatarKey.trim().length > 0);
    const cvComplete = Boolean(cvPath && cvPath.trim().length > 0);
    const idFrontComplete = Boolean(idFrontPath && idFrontPath.trim().length > 0);
    const idBackComplete = Boolean(idBackPath && idBackPath.trim().length > 0);
    const availabilityComplete =
      availableFrom != null && String(availableFrom).trim().length > 0;
    const documentsComplete = cvComplete && idFrontComplete && idBackComplete;
    return {
      onboardingIncomplete: !(
        profileDetailsComplete &&
        publicAvatarComplete &&
        documentsComplete &&
        availabilityComplete
      ),
      documentsIncomplete: !documentsComplete,
      checklist: {
        profileDetailsComplete,
        publicAvatarComplete,
        cvComplete,
        idFrontComplete,
        idBackComplete,
        availabilityComplete,
      },
    };
  }, [name, headline, bio, avatarKey, cvPath, idFrontPath, idBackPath, availableFrom]);

  const loadProfile = useCallback(async (trimmed: string) => {
    setDashboardEmail(trimmed);
    setLoading(true);
    setError(null);
    setNoProfile(false);
    setAmbiguous(false);
    setNotClaimed(false);
    setCanEdit(false);
    setSuccess(false);
    setPhotoSignedUrl(null);

    const { data, error: fetchError } = await supabase
      .from("resources")
      .select(
        "id, name, headline, bio, hourly_rate, location, claimed, avatar_key, profile_photo_path, available_from, cv_document_path, id_front_document_path, id_back_document_path",
      )
      .ilike("contact_email", trimmed);

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      setDashboardEmail(null);
      return;
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      setNoProfile(true);
      setDashboardEmail(trimmed);
      return;
    }
    if (rows.length > 1) {
      setAmbiguous(true);
      setDashboardEmail(trimmed);
      return;
    }

    const row = rows[0] as {
      id: string;
      name: string | null;
      headline: string | null;
      bio: string | null;
      hourly_rate: number | null;
      location: string | null;
      claimed: boolean | null;
      avatar_key: string | null;
      profile_photo_path: string | null;
      available_from: string | null;
      cv_document_path: string | null;
      id_front_document_path: string | null;
      id_back_document_path: string | null;
    };

    setDashboardEmail(trimmed);

    if (row.claimed !== true) {
      setNotClaimed(true);
      return;
    }

    setCanEdit(true);
    setName((row.name as string | null) ?? "");
    setHeadline((row.headline as string | null) ?? "");
    setBio((row.bio as string | null) ?? "");
    setLocation((row.location as string | null) ?? "");
    const rate = row.hourly_rate;
    setHourlyRate(rate != null && Number.isFinite(Number(rate)) ? String(rate) : "");
    setAvatarKey(row.avatar_key ?? null);
    setProfilePhotoPath(row.profile_photo_path ?? null);
    setAvailableFrom(row.available_from ?? null);
    setCvPath(row.cv_document_path ?? null);
    setIdFrontPath(row.id_front_document_path ?? null);
    setIdBackPath(row.id_back_document_path ?? null);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      const trimmed = user?.email?.trim();
      if (!trimmed) {
        setError("Your account has no email address. Add an email to your Procal login to edit your profile.");
        setDashboardEmail(null);
        setLoading(false);
        return;
      }
      await loadProfile(trimmed);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, loadProfile]);

  const photoFetchEligible =
    canEdit &&
    dashboardEmail != null &&
    dashboardEmail.trim() !== "" &&
    profilePhotoPath != null &&
    profilePhotoPath.trim() !== "";

  useEffect(() => {
    if (!photoFetchEligible) {
      startTransition(() => {
        setPhotoSignedUrl(null);
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/talent-profile-photo-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: dashboardEmail!.trim() }),
      });
      const j = (await res.json()) as { url?: string | null };
      if (!cancelled && typeof j.url === "string" && j.url.length > 0) {
        setPhotoSignedUrl(j.url);
      } else if (!cancelled) {
        setPhotoSignedUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoFetchEligible, dashboardEmail, profilePhotoPath]);

  async function persistProfile(overrides?: { profile_photo_path?: null }) {
    if (!dashboardEmail?.trim()) return false;
    const rateTrim = hourlyRate.trim();
    let hourly_rate: number | null = null;
    if (rateTrim !== "") {
      const n = Number(rateTrim);
      if (!Number.isFinite(n) || n < 0) {
        setError("Hourly rate must be a valid non-negative number.");
        return false;
      }
      hourly_rate = n;
    }

    const body: Record<string, unknown> = {
      email: dashboardEmail.trim(),
      name: name.trim(),
      headline: headline.trim() || null,
      bio: bio.trim() || null,
      hourly_rate,
      location: location.trim() || null,
      avatar_key: avatarKey,
    };
    if (overrides?.profile_photo_path === null) {
      body.profile_photo_path = null;
    }

    const res = await fetch("/api/update-consultant-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    let data: { success?: boolean; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      /* ignore */
    }

    if (!res.ok || data.success !== true) {
      setError(typeof data.error === "string" && data.error.trim() !== "" ? data.error : "Update failed");
      return false;
    }
    return true;
  }

  async function handleSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dashboardEmail?.trim()) return;
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const ok = await persistProfile();
    setSubmitting(false);
    if (!ok) return;
    setSuccess(true);
  }

  async function handleRemoveUploadedPhoto() {
    if (!dashboardEmail?.trim()) return;
    setError(null);
    setSubmitting(true);
    const ok = await persistProfile({ profile_photo_path: null });
    setSubmitting(false);
    if (!ok) return;
    setProfilePhotoPath(null);
    setPhotoSignedUrl(null);
  }

  async function handlePhotoSelected(file: File | null) {
    if (file == null || !dashboardEmail?.trim()) return;
    setError(null);
    setUploadBusy(true);
    const fd = new FormData();
    fd.append("email", dashboardEmail.trim());
    fd.append("file", file);
    const res = await fetch("/api/upload-talent-profile-photo", { method: "POST", body: fd });
    const raw = await res.text();
    let data: { success?: boolean; error?: string; path?: string; signedUrl?: string | null } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      /* ignore */
    }
    setUploadBusy(false);
    if (!res.ok || data.success !== true) {
      setError(typeof data.error === "string" && data.error.trim() !== "" ? data.error : "Upload failed");
      return;
    }
    if (typeof data.path === "string") {
      setProfilePhotoPath(data.path);
    }
    if (typeof data.signedUrl === "string" && data.signedUrl.length > 0) {
      setPhotoSignedUrl(data.signedUrl);
    }
  }

  function pickAvatar(key: string) {
    setAvatarKey(key);
    setAvatarModalOpen(false);
  }

  async function handleTalentDocumentUpload(type: TalentDocType, file: File | null) {
    if (file == null || !dashboardEmail?.trim()) return;
    setError(null);
    setDocUploading(type);
    const fd = new FormData();
    fd.append("email", dashboardEmail.trim());
    fd.append("type", type);
    fd.append("file", file);
    const res = await fetch("/api/upload-talent-document", { method: "POST", body: fd });
    const raw = await res.text();
    let data: { success?: boolean; error?: string; path?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      /* ignore */
    }
    setDocUploading(null);
    if (!res.ok || data.success !== true) {
      setError(typeof data.error === "string" && data.error.trim() !== "" ? data.error : "Upload failed");
      return;
    }
    if (typeof data.path === "string") {
      if (type === "cv") setCvPath(data.path);
      else if (type === "id_front") setIdFrontPath(data.path);
      else setIdBackPath(data.path);
    }
  }

  async function openTalentDocumentView(type: TalentDocType) {
    if (!dashboardEmail?.trim()) return;
    setError(null);
    const res = await fetch("/api/talent-document-signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: dashboardEmail.trim(), type }),
    });
    const j = (await res.json()) as { url?: string | null; error?: string };
    if (typeof j.url === "string" && j.url.length > 0) {
      window.open(j.url, "_blank", "noopener,noreferrer");
    } else if (typeof j.error === "string" && j.error.trim() !== "") {
      setError(j.error);
    }
  }

  return (
    <>
      <AppTopNav variant="hero" />
      <div className="relative min-h-screen min-h-dvh overflow-y-auto bg-zinc-950 text-zinc-100">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute -top-24 left-1/2 h-[min(50vh,26rem)] w-[min(130%,44rem)] -translate-x-1/2 rounded-full opacity-90 blur-3xl"
            style={{
              background: `radial-gradient(closest-side, rgba(255,106,0,0.12), transparent 72%)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/95 via-zinc-950 to-black" />
        </div>

        <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 md:px-10 md:pb-20 md:pt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={accentEyebrow}>Talent profile</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">Edit your profile</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
                Your public profile currently shows your selected avatar. Real photo visibility will be controlled
                later.
              </p>
            </div>
            <Link
              href="/consultant"
              className="text-sm font-medium text-white/60 transition hover:text-white"
            >
              ← Talent dashboard
            </Link>
          </div>

          {dashboardEmail != null ? (
            <p className="mt-4 text-xs text-white/45">Editing talent profile for {dashboardEmail}</p>
          ) : null}

          {loading ? <p className="mt-6 text-sm text-white/55">Loading your profile…</p> : null}

          {error ? (
            <p className="mt-6 rounded-xl border border-red-500/35 bg-red-950/50 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : null}

          {noProfile ? (
            <p className={`${glassCard} mt-6 text-sm text-white/70`}>No talent profile found for this email.</p>
          ) : null}

          {ambiguous ? (
            <p className={`${glassCard} mt-6 border-amber-500/30 text-sm text-amber-100`}>
              Multiple profiles match this email. Contact support to update your profile.
            </p>
          ) : null}

          {notClaimed ? (
            <div className={`${glassCard} mt-6`}>
              <p className="text-sm font-semibold text-white">Please claim your profile first</p>
              <p className="mt-2 text-sm text-white/60">
                After you verify your email, you can return here to edit your public profile details.
              </p>
              <Link
                href="/consultant/claim"
                className="mt-4 inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
                style={{ backgroundColor: ACCENT }}
              >
                Claim profile
              </Link>
            </div>
          ) : null}

          {canEdit && onboardingIncomplete ? (
            <div className={`${glassCard} mt-6 border-amber-500/25 bg-amber-950/15`}>
              <p className={accentEyebrow}>Complete setup</p>
              <h2 className="mt-2 text-lg font-semibold text-white">Complete your Talent profile</h2>
              <p className="mt-2 text-sm text-white/60">
                Finish the items below so your profile is ready for verification and discovery. Private documents
                stay off your public listing.
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/50">Required</p>
              <ul className="mt-2 space-y-2">
                <OnboardingChecklistRow done={checklist.profileDetailsComplete}>
                  Profile details (name, headline, bio)
                </OnboardingChecklistRow>
                <OnboardingChecklistRow done={checklist.publicAvatarComplete}>Public avatar</OnboardingChecklistRow>
                <OnboardingChecklistRow done={checklist.cvComplete}>CV</OnboardingChecklistRow>
                <OnboardingChecklistRow done={checklist.idFrontComplete}>ID front</OnboardingChecklistRow>
                <OnboardingChecklistRow done={checklist.idBackComplete}>ID back</OnboardingChecklistRow>
                <OnboardingChecklistRow done={checklist.availabilityComplete}>
                  <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>Availability</span>
                    {!checklist.availabilityComplete ? (
                      <Link
                        href="/consultant/availability"
                        className="text-xs font-semibold text-[#ff6a00] hover:underline"
                      >
                        Set availability →
                      </Link>
                    ) : null}
                  </span>
                </OnboardingChecklistRow>
              </ul>
            </div>
          ) : null}

          {canEdit && success ? (
            <div className={`${glassCard} mt-6 border-emerald-500/25`}>
              <p className="text-base font-semibold text-emerald-100">Profile updated</p>
              {documentsIncomplete ? (
                <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-950/25 px-3 py-2 text-sm text-amber-100/95">
                  Your profile can be saved, but verification is incomplete until all documents are uploaded.
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/consultant"
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Back to dashboard
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-black/30 px-5 py-2.5 text-sm font-medium text-white hover:bg-black/45"
                >
                  View marketplace
                </Link>
              </div>
            </div>
          ) : null}

          {canEdit && !success ? (
            <div className="mt-8 space-y-6">
              <div className={glassCard}>
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                  <div className="flex flex-col items-center gap-4 lg:items-start">
                    {/* TODO: Swap emoji preview for static image assets keyed by avatar_key. */}
                    <PublicAvatarPreviewLarge option={selectedAvatarOption} />
                    <div className="flex w-full max-w-xs flex-col gap-2 sm:flex-row sm:justify-center lg:max-w-none lg:flex-col">
                      <button
                        type="button"
                        onClick={() => setAvatarModalOpen(true)}
                        className="rounded-2xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-orange-500/40 hover:bg-black/45"
                      >
                        Choose public avatar
                      </button>
                    </div>

                    <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#ff6a00]">
                        Upload real photo
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-white/55">
                        Uploaded photo saved privately. Public photo unlock will be added later.
                      </p>
                      <label className="mt-3 inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/20 px-3 py-2.5 text-sm font-medium text-white/80 transition hover:border-orange-500/40 hover:bg-black/35">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          disabled={uploadBusy}
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            e.target.value = "";
                            void handlePhotoSelected(f);
                          }}
                        />
                        {uploadBusy ? "Uploading…" : "Choose file"}
                      </label>
                      {profilePhotoPath != null && profilePhotoPath !== "" ? (
                        <div className="mt-3 space-y-2">
                          {photoFetchEligible && photoSignedUrl != null ? (
                            // eslint-disable-next-line @next/next/no-img-element -- signed URL from own API
                            <img
                              src={photoSignedUrl}
                              alt="Private photo preview"
                              className="mx-auto h-24 w-24 rounded-xl border border-white/10 object-cover"
                            />
                          ) : photoFetchEligible ? (
                            <p className="text-center text-xs text-white/45">Preview loading…</p>
                          ) : null}
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => void handleRemoveUploadedPhoto()}
                            className="w-full rounded-lg border border-white/10 py-1.5 text-xs text-white/60 transition hover:bg-white/5 hover:text-white"
                          >
                            Remove uploaded photo
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {/* TODO: Admin verification screen should list CV/ID securely (signed URLs / service role). */}
                    {/* TODO: Tighten Storage RLS on talent-documents and resource policies before production. */}
                    <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#ff6a00]">
                        Verification documents
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-white/55">
                        Upload your CV and ID documents privately. These are used for verification and are not shown on
                        your public profile.
                      </p>
                      <ul className="mt-4 space-y-4">
                        {(
                          [
                            {
                              type: "cv" as const,
                              title: "CV",
                              accept:
                                ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                              path: cvPath,
                            },
                            {
                              type: "id_front" as const,
                              title: "ID front",
                              accept:
                                ".pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf",
                              path: idFrontPath,
                            },
                            {
                              type: "id_back" as const,
                              title: "ID back",
                              accept:
                                ".pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf",
                              path: idBackPath,
                            },
                          ] as const
                        ).map((row) => (
                          <li key={row.type} className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-white">Upload {row.title}</span>
                              <span
                                className={
                                  row.path != null && row.path.trim() !== ""
                                    ? "text-xs font-medium text-emerald-400"
                                    : "text-xs font-medium text-amber-200/90"
                                }
                              >
                                {row.path != null && row.path.trim() !== "" ? "Uploaded" : "Missing"}
                              </span>
                            </div>
                            <label className="mt-2 inline-flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/18 bg-black/25 px-2 py-2 text-xs font-medium text-white/80 transition hover:border-orange-500/35 hover:bg-black/35">
                              <input
                                type="file"
                                accept={row.accept}
                                className="sr-only"
                                disabled={docUploading != null}
                                onChange={(e) => {
                                  const f = e.target.files?.[0] ?? null;
                                  e.target.value = "";
                                  void handleTalentDocumentUpload(row.type, f);
                                }}
                              />
                              {docUploading === row.type ? "Uploading…" : `Choose ${row.title} file`}
                            </label>
                            {row.path != null && row.path.trim() !== "" ? (
                              <button
                                type="button"
                                className="mt-2 w-full rounded-lg border border-white/10 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
                                onClick={() => void openTalentDocumentView(row.type)}
                              >
                                View
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => void handleSaveProfile(e)}
                    className="min-w-0 flex-1 space-y-5"
                    id="talent-profile-form"
                  >
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="font-medium text-zinc-400">Name</span>
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      <span className="font-medium text-zinc-400">Headline</span>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="Short professional tagline"
                        className={inputClass}
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      <span className="font-medium text-zinc-400">Bio</span>
                      <textarea
                        rows={5}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="How you help clients"
                        className={`${inputClass} resize-y`}
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      <span className="font-medium text-zinc-400">Hourly rate (optional)</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        placeholder="e.g. 1500"
                        className={inputClass}
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      <span className="font-medium text-zinc-400">Location</span>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City or region"
                        className={inputClass}
                      />
                    </label>

                    {documentsIncomplete ? (
                      <p className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
                        Your profile can be saved, but verification is incomplete until all documents are uploaded.
                      </p>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {submitting ? "Saving…" : "Save profile"}
                      </button>
                      <Link
                        href="/consultant"
                        className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-white/15 bg-black/30 px-6 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/45"
                      >
                        Cancel
                      </Link>
                    </div>
                  </form>
                </div>
              </div>

            </div>
          ) : null}
        </main>
      </div>

      {avatarModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            aria-label="Dismiss"
            onClick={() => setAvatarModalOpen(false)}
          />
          <div
            className="relative z-[101] max-h-[min(90dvh,40rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0f1a]/95 p-5 shadow-2xl backdrop-blur-xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-modal-title"
          >
            <h2 id="avatar-modal-title" className="text-lg font-semibold text-white">
              Choose public avatar
            </h2>
            <p className="mt-1 text-xs text-white/55">
              {/* TODO: Swap grid for image thumbnails when static assets exist. */}
              Pick a fun placeholder. This is what visitors see until real-photo unlock ships.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {TALENT_AVATAR_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => pickAvatar(opt.key)}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-transparent p-2 text-center transition hover:border-white/15 hover:bg-white/5"
                >
                  <AvatarCirclePreview option={opt} selected={avatarKey === opt.key} />
                  <span className="text-[10px] font-medium leading-tight text-white/65">{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
