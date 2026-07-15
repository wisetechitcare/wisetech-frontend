import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { getMeetingsByProject, getMeetingsByContact, getMeetingsByEmployee } from '@services/employee';

/**
 * MeetingsList — read-only roster of meetings linked to a record, shared by the
 * project (entity), contact and employee detail pages.
 *
 *   mode="project"   → meetings whose projectId is the given lead/project id
 *   mode="contact"   → meetings where the contact is an external participant
 *   mode="employee"  → meetings the employee organized or participates in
 *
 * The backend pre-resolves organizerName / participantNames /
 * externalParticipantNames, so this component only renders.
 */

interface MeetingRow {
    id: string;
    title: string;
    description?: string;
    isOnline: boolean;
    meetingLink?: string | null;
    location?: string | null;
    startDate: string;
    endDate: string;
    organizerName?: string;
    participantNames?: string[];
    externalParticipantNames?: string[];
}

const th: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase',
    letterSpacing: 0.5, padding: '10px 12px', borderBottom: '1px solid #EEF2F6', textAlign: 'left', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = { padding: '11px 12px', borderBottom: '1px solid #F4F6F9', fontSize: 13, color: '#475569', verticalAlign: 'top' };
const tdTitle: React.CSSProperties = { ...td, fontWeight: 700, color: '#1E293B' };

const namesCell = (names: string[] | undefined) => {
    if (!names || names.length === 0) return <span style={{ color: '#94A3B8' }}>—</span>;
    const shown = names.slice(0, 3).join(', ');
    const extra = names.length - 3;
    return (
        <span title={names.join(', ')}>
            {shown}
            {extra > 0 && <span style={{ color: '#64748B', fontWeight: 600 }}> +{extra} more</span>}
        </span>
    );
};

const FETCHERS = {
    project: getMeetingsByProject,
    contact: getMeetingsByContact,
    employee: getMeetingsByEmployee,
} as const;

const EMPTY_HINTS: Record<keyof typeof FETCHERS, string> = {
    project: 'Meetings created for this project from the Calendar will appear here.',
    contact: 'Meetings where this contact is an external participant will appear here.',
    employee: 'Meetings this employee organizes or attends will appear here.',
};

const MeetingsList: React.FC<{ mode: 'project' | 'contact' | 'employee'; targetId: string }> = ({ mode, targetId }) => {
    const [meetings, setMeetings] = useState<MeetingRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!targetId) return;
        let cancelled = false;
        setLoading(true);

        const fetch = FETCHERS[mode](targetId);
        fetch
            .then((res: any) => {
                if (!cancelled) setMeetings(res?.data || []);
            })
            .catch((err: any) => {
                console.error('Failed to load meetings', err);
                if (!cancelled) setMeetings([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [mode, targetId]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center py-10">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: '#fff', border: '1px solid #EEF2F6', borderRadius: 12, overflow: 'hidden' }}>
            {/* Header strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: meetings.length ? '1px solid #EEF2F6' : 'none' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#1E3A8A14', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-camera-video" style={{ fontSize: 17 }} />
                </div>
                <div>
                    <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: '#1E293B' }}>Meetings</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8' }}>
                        {meetings.length === 0
                            ? 'No meetings linked yet'
                            : `${meetings.length} meeting${meetings.length > 1 ? 's' : ''} · newest first`}
                    </div>
                </div>
            </div>

            {meetings.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                    <i className="bi bi-camera-video-off" style={{ fontSize: 26, color: '#CBD5E1' }} />
                    <div style={{ fontFamily: 'Inter', fontSize: 13.5, fontWeight: 600, color: '#475569', marginTop: 10 }}>
                        No meetings yet
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: 12.5, color: '#94A3B8', marginTop: 4 }}>
                        {EMPTY_HINTS[mode]}
                    </div>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter' }}>
                        <thead>
                            <tr>{['Meeting', 'Schedule', 'Mode', 'Organizer', 'Team Members', 'External Participants'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {meetings.map((m) => {
                                const upcoming = dayjs(m.startDate).isAfter(dayjs());
                                return (
                                    <tr key={m.id}>
                                        <td style={tdTitle}>
                                            <div className="d-flex align-items-center gap-2">
                                                <span
                                                    style={{
                                                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                                        background: upcoming ? '#16a34a' : '#94A3B8',
                                                    }}
                                                    title={upcoming ? 'Upcoming' : 'Past'}
                                                />
                                                <span>{m.title}</span>
                                            </div>
                                            {m.description && (
                                                <div style={{ fontSize: 12, fontWeight: 400, color: '#94A3B8', marginTop: 3, maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.description}>
                                                    {m.description}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                                            <div>{dayjs(m.startDate).format('DD MMM YYYY')}</div>
                                            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                                                {dayjs(m.startDate).format('hh:mm A')} – {dayjs(m.endDate).format('hh:mm A')}
                                            </div>
                                        </td>
                                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                                            {m.isOnline ? (
                                                m.meetingLink ? (
                                                    <a href={m.meetingLink} target="_blank" rel="noreferrer" style={{ color: '#1E3A8A', fontWeight: 600 }}>
                                                        <i className="bi bi-camera-video me-1" />Online · Join
                                                    </a>
                                                ) : (
                                                    <span><i className="bi bi-camera-video me-1" />Online</span>
                                                )
                                            ) : (
                                                <span title={m.location || ''}><i className="bi bi-geo-alt me-1" />{m.location || 'Offline'}</span>
                                            )}
                                        </td>
                                        <td style={{ ...td, whiteSpace: 'nowrap' }}>{m.organizerName || '—'}</td>
                                        <td style={td}>{namesCell(m.participantNames)}</td>
                                        <td style={td}>{namesCell(m.externalParticipantNames)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MeetingsList;
