import {
  type PublicAvailabilityView,
  formatAvailabilityMediumDate,
} from "@/lib/resource-availability";

/**
 * Shared availability copy for marketplace cards and public consultant profile.
 */
export function PublicAvailabilitySummary({
  view,
  size = "xs",
}: {
  view: PublicAvailabilityView;
  size?: "xs" | "sm";
}) {
  const wrap = size === "sm" ? "space-y-2 text-sm leading-snug" : "space-y-1 text-xs leading-snug";
  const labelClass = "text-zinc-500";
  const primaryClass =
    view.variant === "unknown"
      ? "text-zinc-500"
      : view.variant === "unavailable_today" || view.variant === "unavailable_on_selected_date"
        ? "text-amber-300"
        : "text-emerald-400";

  return (
    <div className={wrap}>
      {view.variant === "unknown" ? (
        <p>
          <span className={labelClass}>Availability</span>{" "}
          <span className={`font-medium ${primaryClass}`}>not confirmed</span>
        </p>
      ) : view.variant === "unavailable_on_selected_date" ? (
        <p>
          <span className={labelClass}>Availability</span>{" "}
          <span className={`font-medium ${primaryClass}`}>Unavailable on this date</span>
        </p>
      ) : view.variant === "available_on_selected_date" ? (
        <p>
          <span className={labelClass}>Availability</span>{" "}
          <span className={`font-medium ${primaryClass}`}>
            Available on {formatAvailabilityMediumDate(view.selectedFilterIso!)}
          </span>
        </p>
      ) : view.variant === "unavailable_today" ? (
        <p>
          <span className={labelClass}>Availability</span>{" "}
          <span className={`font-medium ${primaryClass}`}>Unavailable today</span>
        </p>
      ) : view.variant === "available_from" ? (
        <p>
          <span className={labelClass}>Availability</span>{" "}
          <span className={`font-medium ${primaryClass}`}>
            From {formatAvailabilityMediumDate(view.availableFromIso!)}
          </span>
        </p>
      ) : (
        <p>
          <span className={labelClass}>Availability</span>{" "}
          <span className={`font-medium ${primaryClass}`}>Available now</span>
        </p>
      )}
      {view.variant === "available_now" && view.nextUnavailableIso != null ? (
        <p className="text-zinc-500">
          Next unavailable:{" "}
          <span className="text-zinc-400">{formatAvailabilityMediumDate(view.nextUnavailableIso)}</span>
        </p>
      ) : null}
    </div>
  );
}
