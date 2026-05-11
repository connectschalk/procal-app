/**
 * Public marketplace / profile availability using calendar dates in Africa/Johannesburg.
 * Compare blocked_date values as YYYY-MM-DD strings (no UTC clock shifting).
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Current calendar date in South Africa as YYYY-MM-DD. */
export function todayCalendarIsoJohannesburg(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Calendar YYYY-MM-DD for an instant in Africa/Johannesburg (civil date). */
export function calendarIsoInJohannesburgFromInstant(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * Normalizes Postgres `date` / API values to a civil calendar ISO date.
 * `slice(0, 10)` on `…T22:00:00.000Z` can shift the day; this uses Johannesburg for timestamps.
 */
export function normalizeCalendarDateFromDb(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  if (ISO_DATE_RE.test(s)) return s;
  const prefix = s.slice(0, 10);
  if (!ISO_DATE_RE.test(prefix)) return null;
  if (s.length === 10) return prefix;
  const sep = s[10];
  if (sep !== "T" && sep !== " " && sep !== "t") return prefix;
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return prefix;
  return calendarIsoInJohannesburgFromInstant(new Date(ms));
}

export function normalizeIsoDate(raw: string | null | undefined): string | null {
  return normalizeCalendarDateFromDb(raw);
}

export function uniqueSortedIsoDates(dates: string[]): string[] {
  const set = new Set<string>();
  for (const d of dates) {
    const n = normalizeCalendarDateFromDb(d);
    if (n != null) set.add(n);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export type PublicAvailabilityVariant =
  | "unknown"
  | "unavailable_today"
  | "unavailable_on_selected_date"
  | "available_on_selected_date"
  | "available_from"
  | "available_now";

export type PublicAvailabilityView = {
  blockedDataLoadSucceeded: boolean;
  variant: PublicAvailabilityVariant;
  /** Earliest blocked date strictly after today (YYYY-MM-DD), when variant is `available_now` */
  nextUnavailableIso: string | null;
  availableFromIso: string | null;
  /** Set when marketplace date filter is active */
  selectedFilterIso: string | null;
};

/**
 * Single source of truth for marketplace cards and public consultant profile.
 */
export function computePublicAvailabilityView(args: {
  blockedDataLoadSucceeded: boolean;
  blockedDatesIso: string[];
  availableFromIso: string | null;
  /** Marketplace "Available by date" filter (YYYY-MM-DD). When set, overrides default card copy. */
  selectedFilterIso?: string | null;
  /** For tests; defaults to Johannesburg "today". */
  now?: Date;
}): PublicAvailabilityView {
  const today = todayCalendarIsoJohannesburg(args.now ?? new Date());
  const filterNorm = normalizeIsoDate(args.selectedFilterIso ?? null);
  const fromOk = normalizeIsoDate(args.availableFromIso);
  const blocked = uniqueSortedIsoDates(args.blockedDatesIso);

  const baseUnknown = (): PublicAvailabilityView => ({
    blockedDataLoadSucceeded: false,
    variant: "unknown",
    nextUnavailableIso: null,
    availableFromIso: fromOk,
    selectedFilterIso: null,
  });

  if (filterNorm != null) {
    if (!args.blockedDataLoadSucceeded) {
      return {
        blockedDataLoadSucceeded: false,
        variant: "unknown",
        nextUnavailableIso: null,
        availableFromIso: fromOk,
        selectedFilterIso: filterNorm,
      };
    }
    if (blocked.includes(filterNorm)) {
      return {
        blockedDataLoadSucceeded: true,
        variant: "unavailable_on_selected_date",
        nextUnavailableIso: null,
        availableFromIso: fromOk,
        selectedFilterIso: filterNorm,
      };
    }
    return {
      blockedDataLoadSucceeded: true,
      variant: "available_on_selected_date",
      nextUnavailableIso: null,
      availableFromIso: fromOk,
      selectedFilterIso: filterNorm,
    };
  }

  if (!args.blockedDataLoadSucceeded) {
    return baseUnknown();
  }

  if (blocked.includes(today)) {
    return {
      blockedDataLoadSucceeded: true,
      variant: "unavailable_today",
      nextUnavailableIso: null,
      availableFromIso: fromOk,
      selectedFilterIso: null,
    };
  }

  if (fromOk != null && fromOk > today) {
    return {
      blockedDataLoadSucceeded: true,
      variant: "available_from",
      nextUnavailableIso: null,
      availableFromIso: fromOk,
      selectedFilterIso: null,
    };
  }

  const futureBlocks = blocked.filter((d) => d > today);
  const next = futureBlocks.length > 0 ? futureBlocks.sort((a, b) => a.localeCompare(b))[0]! : null;

  return {
    blockedDataLoadSucceeded: true,
    variant: "available_now",
    nextUnavailableIso: next,
    availableFromIso: fromOk,
    selectedFilterIso: null,
  };
}

export function formatAvailabilityMediumDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(d);
}
