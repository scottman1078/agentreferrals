export interface VideoIntro {
  id: string
  agentId: string
  videoUrl: string         // URL to uploaded video (S3/Supabase Storage)
  thumbnailUrl?: string    // optional custom thumbnail
  duration: number         // seconds
  uploadedAt: string
  views: number
  title: string            // short label, e.g. "Meet Ashley — Nashville Specialist"
}

export interface ZoomInterview {
  id: string
  requesterId: string      // agent who requested the interview
  intervieweeId: string    // agent being interviewed
  requesterName: string
  intervieweeName: string
  status: 'pending' | 'scheduled' | 'completed' | 'declined'
  scheduledAt: string | null
  zoomLink: string | null
  recordingUrl: string | null   // after interview, recording can be made public
  isPublic: boolean             // whether recording is visible on profile
  duration: number | null       // minutes
  requestedAt: string
  completedAt: string | null
  notes: string | null          // short description of what was discussed
}

// ── Mock video intros ──
export const videoIntros: VideoIntro[] = [
  {
    id: 'vi-1',
    agentId: 'ashley',
    videoUrl: '/videos/ashley-intro.mp4',
    duration: 87,
    uploadedAt: '2025-02-15',
    views: 142,
    title: 'Meet Ashley — Nashville Relocation Specialist',
  },
  {
    id: 'vi-2',
    agentId: 'carlos',
    videoUrl: '/videos/carlos-intro.mp4',
    duration: 63,
    uploadedAt: '2025-02-20',
    views: 98,
    title: 'Carlos Vega — Luxury & New Construction in DFW',
  },
  {
    id: 'vi-3',
    agentId: 'rachel',
    videoUrl: '/videos/rachel-intro.mp4',
    duration: 95,
    uploadedAt: '2025-03-01',
    views: 215,
    title: 'Rachel Kim — Beverly Hills Luxury Real Estate',
  },
  {
    id: 'vi-4',
    agentId: 'tanya',
    videoUrl: '/videos/tanya-intro.mp4',
    duration: 72,
    uploadedAt: '2025-02-25',
    views: 167,
    title: 'Tanya Hill — Your Atlanta Connection',
  },
  {
    id: 'vi-5',
    agentId: 'jason',
    videoUrl: '/videos/jason-intro.mp4',
    duration: 78,
    uploadedAt: '2025-03-10',
    views: 54,
    title: "Jason O'Brien — West Michigan Homes for Heroes",
  },
  {
    id: 'vi-6',
    agentId: 'marcus',
    videoUrl: '/videos/marcus-intro.mp4',
    duration: 68,
    uploadedAt: '2025-02-18',
    views: 131,
    title: 'Marcus Reid — Chicago Luxury Real Estate',
  },
  {
    id: 'vi-7',
    agentId: 'darius',
    videoUrl: '/videos/darius-intro.mp4',
    duration: 82,
    uploadedAt: '2025-01-28',
    views: 89,
    title: 'Darius King — Phoenix New Construction & Investment',
  },
  {
    id: 'vi-8',
    agentId: 'sarah_t',
    videoUrl: '/videos/sarah-intro.mp4',
    duration: 90,
    uploadedAt: '2025-03-05',
    views: 73,
    title: 'Sarah Thompson — Toronto GTA Specialist',
  },
]

// ── Mock zoom interviews ──
export const zoomInterviews: ZoomInterview[] = [
  {
    id: 'zi-1',
    requesterId: 'jason',
    intervieweeId: 'ashley',
    requesterName: "Jason O'Brien",
    intervieweeName: 'Ashley Monroe',
    status: 'completed',
    scheduledAt: '2025-01-20T15:00:00Z',
    zoomLink: null,
    recordingUrl: '/recordings/jason-ashley-interview.mp4',
    isPublic: true,
    duration: 18,
    requestedAt: '2025-01-15T10:00:00Z',
    completedAt: '2025-01-20T15:20:00Z',
    notes: 'Discussed Nashville relocation trends, referral workflow, and client handoff process.',
  },
  {
    id: 'zi-2',
    requesterId: 'jason',
    intervieweeId: 'carlos',
    requesterName: "Jason O'Brien",
    intervieweeName: 'Carlos Vega',
    status: 'completed',
    scheduledAt: '2025-02-05T14:00:00Z',
    zoomLink: null,
    recordingUrl: '/recordings/jason-carlos-interview.mp4',
    isPublic: true,
    duration: 22,
    requestedAt: '2025-02-01T09:00:00Z',
    completedAt: '2025-02-05T14:25:00Z',
    notes: 'Covered luxury market strategy in DFW, new construction process, and fee structure.',
  },
  {
    id: 'zi-3',
    requesterId: 'jason',
    intervieweeId: 'tanya',
    requesterName: "Jason O'Brien",
    intervieweeName: 'Tanya Hill',
    status: 'scheduled',
    scheduledAt: '2026-03-22T16:00:00Z',
    zoomLink: 'https://zoom.us/j/123456789',
    recordingUrl: null,
    isPublic: false,
    duration: null,
    requestedAt: '2026-03-15T08:00:00Z',
    completedAt: null,
    notes: null,
  },
  {
    id: 'zi-4',
    requesterId: 'marcus',
    intervieweeId: 'jason',
    requesterName: 'Marcus Reid',
    intervieweeName: "Jason O'Brien",
    status: 'completed',
    scheduledAt: '2025-01-10T13:00:00Z',
    zoomLink: null,
    recordingUrl: '/recordings/marcus-jason-interview.mp4',
    isPublic: true,
    duration: 15,
    requestedAt: '2025-01-05T11:00:00Z',
    completedAt: '2025-01-10T13:18:00Z',
    notes: 'Michigan market overview, Homes for Heroes program, and rural property expertise.',
  },
  {
    id: 'zi-5',
    requesterId: 'rachel',
    intervieweeId: 'ashley',
    requesterName: 'Rachel Kim',
    intervieweeName: 'Ashley Monroe',
    status: 'completed',
    scheduledAt: '2025-02-28T11:00:00Z',
    zoomLink: null,
    recordingUrl: '/recordings/rachel-ashley-interview.mp4',
    isPublic: true,
    duration: 20,
    requestedAt: '2025-02-24T09:00:00Z',
    completedAt: '2025-02-28T11:22:00Z',
    notes: 'LA-to-Nashville relocation pipeline, luxury client expectations, and communication standards.',
  },
  {
    id: 'zi-6',
    requesterId: 'sofia',
    intervieweeId: 'darius',
    requesterName: 'Sofia Chen',
    intervieweeName: 'Darius King',
    status: 'pending',
    scheduledAt: null,
    zoomLink: null,
    recordingUrl: null,
    isPublic: false,
    duration: null,
    requestedAt: '2026-03-16T14:00:00Z',
    completedAt: null,
    notes: null,
  },
]

// ── Helpers ──

export function getVideoIntro(agentId: string): VideoIntro | null {
  return videoIntros.find((v) => v.agentId === agentId) ?? null
}

export function getAgentInterviews(agentId: string): ZoomInterview[] {
  return zoomInterviews
    .filter((z) => (z.requesterId === agentId || z.intervieweeId === agentId))
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
}

export function getPublicInterviews(agentId: string): ZoomInterview[] {
  return zoomInterviews
    .filter(
      (z) =>
        z.status === 'completed' &&
        z.isPublic &&
        (z.requesterId === agentId || z.intervieweeId === agentId)
    )
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
}

export function getPendingInterviewRequests(agentId: string): ZoomInterview[] {
  return zoomInterviews.filter(
    (z) => z.intervieweeId === agentId && (z.status === 'pending' || z.status === 'scheduled')
  )
}

/** Format seconds to "M:SS" */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
