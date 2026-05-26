import React, { memo, useCallback, useMemo } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { WORKING_METHOD_TYPE } from '@constants/attendance';
import { ATTENDANCE_COLORS } from '@utils/attendanceColorUtils';
import './AttendanceCheckCell.css';

export interface AttendanceCoordinates {
  lat: number;
  lng: number;
}

export interface AttendanceCheckCellProps {
  time: string;
  method?: string;
  location?: string;
  fullAddress?: string;
  coordinates?: AttendanceCoordinates | null;
  label: 'Check-In' | 'Check-Out';
  type?: 'in' | 'out';
  /** Time line color from resolveCheckInColor / resolveCheckOutColor */
  timeColor?: string;
  /** Explains late check-in (hover) */
  timeTooltip?: string;
}

const MISSING = new Set(['-NA-', '-', 'N/A', 'NA', '']);

export function isAttendanceValueMissing(value?: string | null): boolean {
  if (value == null) return true;
  const trimmed = String(value).trim();
  return trimmed === '' || MISSING.has(trimmed);
}

export function hasValidMapCoordinates(
  coordinates?: AttendanceCoordinates | null
): coordinates is AttendanceCoordinates {
  if (!coordinates) return false;
  const { lat, lng } = coordinates;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    !(lat === 0 && lng === 0)
  );
}

function formatMethodLabel(method: string): string {
  if (method === WORKING_METHOD_TYPE.ON_SITE) return 'On-site';
  if (method === WORKING_METHOD_TYPE.OFFICE) return 'Office';
  if (method === WORKING_METHOD_TYPE.REMOTE) return 'Hybrid';
  return method;
}

function getMethodDotColor(method: string, hasTime: boolean): string {
  if (!hasTime) return '#6C757D';
  const key = method.trim().replace(/-/g, '').replace(/\s+/g, '').toLowerCase();
  if (key === 'office') return '#0D6EFD';
  if (key === 'onsite') return '#FFC107';
  return '#6C757D';
}

function openGoogleMaps(lat: number, lng: number) {
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Stacked check-in / check-out cell: time + method • location.
 * Map link and tooltip only when GPS coordinates exist (on-site).
 */
function AttendanceCheckCell({
  time,
  method = '',
  location = '',
  fullAddress,
  coordinates = null,
  label,
  timeColor,
  timeTooltip,
}: AttendanceCheckCellProps) {
  const hasTime = !isAttendanceValueMissing(time);
  const hasMethod = !isAttendanceValueMissing(method);
  const hasLocation = !isAttendanceValueMissing(location);
  const isMapInteractive = hasValidMapCoordinates(coordinates);

  const displayTime = hasTime ? time : '—';
  const displayMethod = hasMethod ? formatMethodLabel(method) : '—';
  const locationText = hasLocation ? location : '—';
  const tooltipAddress = (fullAddress && !isAttendanceValueMissing(fullAddress))
    ? fullAddress
    : (hasLocation ? location : '');

  const dotColor = getMethodDotColor(hasMethod ? method : '', hasTime);

  const handleMapActivate = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      if (!isMapInteractive || !coordinates) return;
      event.stopPropagation();
      if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return;
      if ('key' in event) event.preventDefault();
      openGoogleMaps(coordinates.lat, coordinates.lng);
    },
    [coordinates, isMapInteractive]
  );

  const tooltipOverlay = useMemo(
    () => (
      <Tooltip id={`${label}-location-tooltip`}>
        <div>{tooltipAddress || '—'}</div>
        {isMapInteractive && (
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
            Click to open in Maps ↗
          </div>
        )}
      </Tooltip>
    ),
    [isMapInteractive, label, tooltipAddress]
  );

  const locationNode = isMapInteractive ? (
    <OverlayTrigger placement="auto" overlay={tooltipOverlay}>
      <span
        role="link"
        tabIndex={0}
        className="attendance-check-cell__location attendance-check-cell__location--interactive"
        title={tooltipAddress}
        aria-label={`View ${label.toLowerCase()} location on Google Maps`}
        onClick={handleMapActivate}
        onKeyDown={handleMapActivate}
      >
        {locationText}
      </span>
    </OverlayTrigger>
  ) : hasLocation ? (
    <span
      className="attendance-check-cell__location"
      title={tooltipAddress.length > 40 ? tooltipAddress : undefined}
    >
      {locationText}
    </span>
  ) : (
    <span className="attendance-check-cell__location">—</span>
  );

  const resolvedTimeColor = timeColor ?? ATTENDANCE_COLORS.normal;

  const timeLine = (
    <div
      className="attendance-check-cell__time"
      style={{ color: resolvedTimeColor }}
    >
      {displayTime}
    </div>
  );

  return (
    <div className="attendance-check-cell">
      {timeTooltip ? (
        <OverlayTrigger
          placement="auto"
          overlay={<Tooltip id={`${label}-time-tooltip`}>{timeTooltip}</Tooltip>}
        >
          <span>{timeLine}</span>
        </OverlayTrigger>
      ) : (
        timeLine
      )}
      <div className="attendance-check-cell__meta">
        <span
          className="attendance-check-cell__dot"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />
        <span className="attendance-check-cell__method">{displayMethod}</span>
        <span className="attendance-check-cell__sep" aria-hidden>
          •
        </span>
        {locationNode}
        {isMapInteractive && (
          <KTIcon iconName="geolocation" className="attendance-check-cell__icon" />
        )}
      </div>
    </div>
  );
}

export default memo(AttendanceCheckCell);

/** Export-friendly single-line value (CSV / Excel) */
export function formatAttendanceCheckExport(
  time: string,
  method?: string,
  location?: string
): string {
  const t = isAttendanceValueMissing(time) ? '—' : time;
  const m = isAttendanceValueMissing(method) ? '—' : formatMethodLabel(method!);
  const l = isAttendanceValueMissing(location) ? '—' : location!;
  return `${t} | ${m} | ${l}`;
}
