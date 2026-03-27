'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Bot,
  Calendar,
  Camera,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Droplets,
  Flame,
  Hammer,
  Headphones,
  Loader2,
  MessageSquare,
  Mic,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface TranscriptEntry {
  role: 'customer' | 'ai';
  content: string;
  timestamp: string;
}

interface VapiCall {
  id: string;
  status: string;
  type: string;
  createdAt: string;
  endedAt: string;
  cost: number | null;
  customerPhone: string;
  summary: string;
  success: boolean;
  transcript: TranscriptEntry[];
  duration: number;
  recordingUrl: string | null;
  stereoRecordingUrl: string | null;
}

interface MockConversation {
  id: number;
  name: string;
  initials: string;
  channel: 'Voice' | 'SMS';
  duration: string;
  status: 'Completed' | 'Transferred' | 'Scheduled';
  urgency: 'Emergency' | 'Urgent' | 'Routine';
  summary: string;
  transcript: string;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const PRIMARY = '#1e40af';

const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: 1,
    name: 'Maria Santos',
    initials: 'MS',
    channel: 'Voice',
    duration: '3m 42s',
    status: 'Completed',
    urgency: 'Emergency',
    summary: 'Emergency water leak in basement — dispatched emergency crew',
    transcript:
      '"There\'s water pouring from my ceiling into the basement! I need someone right away." — AI confirmed address, dispatched emergency technician within 45 minutes, sent SMS confirmation.',
  },
  {
    id: 2,
    name: 'James Chen',
    initials: 'JC',
    channel: 'Voice',
    duration: '2m 15s',
    status: 'Scheduled',
    urgency: 'Routine',
    summary: 'Slow kitchen drain — booked drain cleaning for Thursday',
    transcript:
      '"My kitchen sink is draining really slowly and it\'s getting worse." — AI asked about duration of issue, booked Thursday 10 AM slot, quoted standard rate.',
  },
  {
    id: 3,
    name: 'Patricia Williams',
    initials: 'PW',
    channel: 'SMS',
    duration: '-',
    status: 'Scheduled',
    urgency: 'Urgent',
    summary: 'Hot water tank not heating — replacement quote requested',
    transcript:
      '"No hot water since this morning. Tank is 12 years old." — AI collected tank model info, scheduled assessment for next day, provided estimated replacement range ($1,800-$3,200).',
  },
  {
    id: 4,
    name: 'Robert Kim',
    initials: 'RK',
    channel: 'Voice',
    duration: '4m 30s',
    status: 'Scheduled',
    urgency: 'Routine',
    summary: 'Full bathroom renovation — in-home consultation booked',
    transcript:
      '"We want to completely redo our main bathroom. New tub, vanity, tile, everything." — AI gathered scope details, square footage, budget range. Booked in-home consultation for Saturday.',
  },
  {
    id: 5,
    name: 'Linda Thompson',
    initials: 'LT',
    channel: 'Voice',
    duration: '1m 05s',
    status: 'Transferred',
    urgency: 'Emergency',
    summary: 'Gas smell detected — directed to call 911 immediately',
    transcript:
      '"I think I smell gas near my water heater." — AI immediately advised caller to leave the house, call 911, and contact Enbridge. Stayed on line until caller confirmed they were safe outside.',
  },
  {
    id: 6,
    name: 'David Okafor',
    initials: 'DO',
    channel: 'Voice',
    duration: '2m 50s',
    status: 'Scheduled',
    urgency: 'Routine',
    summary: 'Kitchen faucet replacement — installation appointment set',
    transcript:
      '"I bought a new Moen faucet and need it installed. My current one is leaking at the base." — AI confirmed faucet model compatibility, booked installation for Wednesday afternoon.',
  },
  {
    id: 7,
    name: 'Susan Park',
    initials: 'SP',
    channel: 'SMS',
    duration: '-',
    status: 'Scheduled',
    urgency: 'Routine',
    summary: 'Sewer line camera inspection — diagnostic appointment booked',
    transcript:
      '"Recurring backups in the basement floor drain. Need a camera inspection." — AI noted history of backups, scheduled camera inspection with a senior technician for Friday morning.',
  },
  {
    id: 8,
    name: 'Michael Fraser',
    initials: 'MF',
    channel: 'Voice',
    duration: '3m 10s',
    status: 'Completed',
    urgency: 'Emergency',
    summary: 'Frozen burst pipe in garage — emergency crew dispatched',
    transcript:
      '"A pipe burst in my garage and there\'s water spraying everywhere!" — AI walked caller through shutting off main water valve, then dispatched emergency crew with an ETA of 30 minutes.',
  },
];

const FEATURED_TRANSCRIPT: TranscriptEntry[] = [
  {
    role: 'ai',
    content:
      "Thank you for calling True Service Plumbing. This is the AI assistant. How can I help you today?",
    timestamp: '0:00',
  },
  {
    role: 'customer',
    content:
      "Hi, I bought a new kitchen faucet and I need someone to install it. My current one has been leaking at the base for a while now.",
    timestamp: '0:08',
  },
  {
    role: 'ai',
    content:
      "I'd be happy to help you get that taken care of. Can I get the make and model of your new faucet? That way our technician can come prepared with the right tools.",
    timestamp: '0:18',
  },
  {
    role: 'customer',
    content:
      "It's a Moen Arbor single-handle pull-down. I got it from Home Depot.",
    timestamp: '0:28',
  },
  {
    role: 'ai',
    content:
      "Great choice — very popular model. And what's the address where you need the installation?",
    timestamp: '0:34',
  },
  {
    role: 'customer',
    content: "It's 42 Maple Drive in Mississauga, postal code L5B 3C7.",
    timestamp: '0:40',
  },
  {
    role: 'ai',
    content:
      "Perfect, that's right in our service area. I have Wednesday afternoon available between 1 PM and 3 PM, or Thursday morning 9 AM to 11 AM. Which works better for you?",
    timestamp: '0:48',
  },
  {
    role: 'customer',
    content: "Wednesday afternoon would be perfect.",
    timestamp: '0:58',
  },
  {
    role: 'ai',
    content:
      "Excellent. I've booked you for Wednesday between 1 PM and 3 PM at 42 Maple Drive, Mississauga. Our technician David will be handling the installation. You'll receive a text confirmation shortly, and another reminder the morning of your appointment. The standard installation rate is $149 plus tax. Is there anything else I can help with?",
    timestamp: '1:04',
  },
  {
    role: 'customer',
    content: "No, that's everything. Thanks so much!",
    timestamp: '1:22',
  },
  {
    role: 'ai',
    content:
      "You're welcome! We'll see you Wednesday. Have a great day.",
    timestamp: '1:26',
  },
];

const PIPELINE_STAGES = [
  { label: 'New Leads', count: 45, color: 'from-blue-400 to-blue-600', width: '100%' },
  { label: 'Contacted', count: 28, color: 'from-sky-400 to-sky-600', width: '62%' },
  { label: 'Qualified', count: 18, color: 'from-indigo-400 to-indigo-600', width: '40%' },
  { label: 'Booked', count: 10, color: 'from-violet-400 to-violet-600', width: '22%' },
  { label: 'Completed', count: 4, color: 'from-emerald-400 to-emerald-600', width: '9%' },
];

const SERVICES = [
  {
    icon: Wrench,
    name: 'General Plumbing',
    description: 'Repairs, maintenance, and troubleshooting for all residential plumbing systems.',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Droplets,
    name: 'Drain Cleaning',
    description: 'Professional hydro-jetting and mechanical clearing for stubborn blockages.',
    bg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
  {
    icon: Flame,
    name: 'Hot Water Tanks',
    description: 'Installation, repair, and replacement of tank and tankless water heaters.',
    bg: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
  {
    icon: Camera,
    name: 'Camera Inspection',
    description: 'HD sewer line camera diagnostics to pinpoint problems without excavation.',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    icon: AlertTriangle,
    name: 'Emergency 24/7',
    description: 'Round-the-clock emergency response for burst pipes, floods, and gas leaks.',
    bg: 'bg-red-50',
    iconColor: 'text-red-600',
  },
  {
    icon: Hammer,
    name: 'Installation Services',
    description: 'Expert fixture, appliance, and bathroom/kitchen plumbing installations.',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
];

const HOW_IT_WORKS = [
  { icon: Phone, label: 'Customer Calls', description: 'A customer dials your business number' },
  { icon: Bot, label: 'AI Answers', description: 'Our AI receptionist picks up instantly' },
  { icon: Calendar, label: 'Appointment Booked', description: 'Details captured and slot confirmed' },
  { icon: Bell, label: 'You Get Notified', description: 'Real-time alert sent to your team' },
];

/* -------------------------------------------------------------------------- */
/*  Subcomponents                                                              */
/* -------------------------------------------------------------------------- */

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play().catch(() => {});
    }
    setPlaying(!playing);
  }, [playing]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnd);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-transform hover:scale-105 active:scale-95"
        aria-label={playing ? 'Pause recording' : 'Play recording'}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
      </button>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function LiveCallsSection() {
  const [calls, setCalls] = useState<VapiCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/calls');
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data: VapiCall[] = await res.json();
      setCalls(data.slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calls');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const formatDuration = (s: number) => {
    if (s <= 0) return '-';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${String(sec).padStart(2, '0')}s`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'ended':
        return 'bg-emerald-100 text-emerald-700';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      case 'ringing':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="h-3 w-48 rounded bg-slate-200" />
              </div>
              <div className="h-6 w-16 rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 py-10 text-center">
        <PhoneMissed className="h-8 w-8 text-red-400" />
        <p className="text-sm font-medium text-red-700">{error}</p>
        <button
          onClick={fetchCalls}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-10 text-center">
        <Headphones className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500">No calls recorded yet. Connect your Vapi account to see live data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => {
        const audioSrc = call.stereoRecordingUrl || call.recordingUrl;
        const isExpanded = expandedId === call.id;
        return (
          <div
            key={call.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow duration-150 hover:shadow-md"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : call.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                {call.type === 'inbound' ? (
                  <PhoneIncoming className="h-4.5 w-4.5 text-blue-600" />
                ) : (
                  <PhoneCall className="h-4.5 w-4.5 text-blue-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {call.customerPhone}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColor(call.status)}`}>
                    {call.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {call.summary || 'No summary available'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                <span className="tabular-nums">{formatDuration(call.duration)}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
                {audioSrc && (
                  <div className="mb-4">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Recording
                    </p>
                    <AudioPlayer src={audioSrc} />
                  </div>
                )}
                {call.transcript.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Transcript
                    </p>
                    <div className="space-y-2">
                      {call.transcript.map((entry, i) => (
                        <div
                          key={i}
                          className={`flex ${entry.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                              entry.role === 'ai'
                                ? 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200'
                                : 'rounded-br-md bg-blue-600 text-white'
                            }`}
                          >
                            {entry.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400">No transcript available for this call.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function TrueServicePlumbingDemo() {
  const [expandedConversation, setExpandedConversation] = useState<number | null>(null);
  const [showFeatured, setShowFeatured] = useState(false);

  /* ---- KPI data ---- */
  const kpis = [
    {
      label: 'Calls Handled',
      value: '847',
      trend: '+23%',
      trendUp: true,
      icon: PhoneCall,
      accent: 'border-blue-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Appointments Booked',
      value: '234',
      trend: '+18%',
      trendUp: true,
      icon: Calendar,
      accent: 'border-emerald-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Missed Calls Recovered',
      value: '156',
      trend: '89% recovery',
      trendUp: true,
      icon: PhoneMissed,
      accent: 'border-amber-500',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Revenue Saved',
      value: '$124,800',
      trend: '+31%',
      trendUp: true,
      icon: DollarSign,
      accent: 'border-violet-500',
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      {/* ------------------------------------------------------------------- */}
      {/*  A. Header / Hero                                                     */}
      {/* ------------------------------------------------------------------- */}
      <header className="relative border-b border-slate-200 bg-gradient-to-b from-blue-50/80 to-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Logo area */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm"
                style={{ backgroundColor: PRIMARY }}
              >
                <Wrench className="h-5.5 w-5.5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  True Service Plumbing Inc.
                </h1>
                <p className="text-xs text-slate-500">AI Receptionist Dashboard</p>
              </div>
            </div>

            {/* Right badges */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                Demo Mode
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* ----------------------------------------------------------------- */}
        {/*  B. KPI Cards                                                      */}
        {/* ----------------------------------------------------------------- */}
        <section className="mb-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${kpi.accent} border-t-2`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        {kpi.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
                        {kpi.value}
                      </p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.iconBg}`}>
                      <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-600">{kpi.trend}</span>
                    <span className="text-xs text-slate-400">vs last month</span>
                  </div>
                  {/* Bottom accent bar */}
                  <div
                    className={`absolute bottom-0 left-0 h-0.5 w-full ${kpi.accent.replace('border-', 'bg-')}`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/*  C. Live Calls Section                                             */}
        {/* ----------------------------------------------------------------- */}
        <section className="mb-12">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Headphones className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Live Calls</h2>
              <p className="text-xs text-slate-500">Real-time data from your Vapi integration</p>
            </div>
          </div>
          <LiveCallsSection />
        </section>

        {/* ----------------------------------------------------------------- */}
        {/*  D. Recent Conversations                                           */}
        {/* ----------------------------------------------------------------- */}
        <section className="mb-12">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
              <MessageSquare className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Conversations</h2>
              <p className="text-xs text-slate-500">Latest customer interactions handled by the AI receptionist</p>
            </div>
          </div>

          <div className="space-y-3">
            {MOCK_CONVERSATIONS.map((conv) => {
              const isExpanded = expandedConversation === conv.id;
              return (
                <div
                  key={conv.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow duration-150 hover:shadow-md"
                >
                  <button
                    onClick={() => setExpandedConversation(isExpanded ? null : conv.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    {/* Avatar */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {conv.initials}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{conv.name}</span>
                        {/* Channel badge */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            conv.channel === 'Voice'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {conv.channel === 'Voice' ? (
                            <Mic className="h-2.5 w-2.5" />
                          ) : (
                            <MessageSquare className="h-2.5 w-2.5" />
                          )}
                          {conv.channel}
                        </span>
                        {/* Urgency badge */}
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            conv.urgency === 'Emergency'
                              ? 'bg-red-100 text-red-700'
                              : conv.urgency === 'Urgent'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {conv.urgency}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{conv.summary}</p>
                    </div>

                    {/* Right side */}
                    <div className="flex shrink-0 items-center gap-3">
                      {conv.duration !== '-' && (
                        <span className="hidden items-center gap-1 text-xs tabular-nums text-slate-400 sm:inline-flex">
                          <Clock className="h-3 w-3" />
                          {conv.duration}
                        </span>
                      )}
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          conv.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : conv.status === 'Scheduled'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {conv.status}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
                      <p className="text-sm leading-relaxed text-slate-600">{conv.transcript}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/*  E. Featured Conversation Detail                                   */}
        {/* ----------------------------------------------------------------- */}
        <section className="mb-12">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button
              onClick={() => setShowFeatured(!showFeatured)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                  <PhoneCall className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Featured: Kitchen Faucet Installation Call
                  </h2>
                  <p className="text-xs text-slate-500">
                    David Okafor &middot; 2m 50s &middot; Full AI conversation transcript
                  </p>
                </div>
              </div>
              {showFeatured ? (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-slate-400" />
              )}
            </button>

            {showFeatured && (
              <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-5 py-6">
                <div className="mx-auto max-w-2xl space-y-3">
                  {FEATURED_TRANSCRIPT.map((entry, i) => (
                    <div
                      key={i}
                      className={`flex ${entry.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className="flex max-w-[85%] flex-col gap-1">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            entry.role === 'ai' ? 'text-blue-500' : 'text-slate-400'
                          }`}
                        >
                          {entry.role === 'ai' ? 'AI Receptionist' : 'Customer'}{' '}
                          <span className="font-normal text-slate-300">{entry.timestamp}</span>
                        </span>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            entry.role === 'ai'
                              ? 'rounded-bl-md bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                              : 'rounded-br-md bg-blue-600 text-white'
                          }`}
                        >
                          {entry.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mx-auto mt-6 max-w-2xl rounded-lg bg-emerald-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-800">Appointment Confirmed</p>
                      <p className="mt-0.5 text-xs text-emerald-700">
                        Wednesday 1:00 PM - 3:00 PM &middot; 42 Maple Drive, Mississauga &middot;
                        Technician: David &middot; Faucet Installation ($149 + tax)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/*  F. Pipeline Funnel                                                */}
        {/* ----------------------------------------------------------------- */}
        <section className="mb-12">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
              <Users className="h-4.5 w-4.5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Pipeline Funnel</h2>
              <p className="text-xs text-slate-500">Lead progression from first contact to job completion</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5">
            <div className="space-y-4">
              {PIPELINE_STAGES.map((stage) => (
                <div key={stage.label} className="flex items-center gap-4">
                  <span className="w-24 shrink-0 text-right text-sm font-medium text-slate-600">
                    {stage.label}
                  </span>
                  <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-slate-100">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r ${stage.color} transition-[width] duration-700 ease-out`}
                      style={{ width: stage.width }}
                    >
                      {/* Shine animation */}
                      <div className="absolute inset-0 overflow-hidden rounded-lg">
                        <div
                          className="absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          style={{
                            animation: 'shine 3s ease-in-out infinite',
                          }}
                        />
                      </div>
                    </div>
                    <span className="absolute inset-y-0 left-3 flex items-center text-xs font-bold tabular-nums text-white drop-shadow-sm">
                      {stage.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <style>{`
            @keyframes shine {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(300%); }
              100% { transform: translateX(300%); }
            }
          `}</style>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/*  G. Services Grid                                                  */}
        {/* ----------------------------------------------------------------- */}
        <section className="mb-12">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50">
              <Wrench className="h-4.5 w-4.5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Services Offered</h2>
              <p className="text-xs text-slate-500">Full range of plumbing services your AI can book</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.name}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${service.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${service.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{service.name}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/*  H. How It Works                                                   */}
        {/* ----------------------------------------------------------------- */}
        <section className="mb-12">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">How It Works</h2>
            <p className="mt-1 text-sm text-slate-500">Four simple steps from call to confirmation</p>
          </div>

          <div className="relative">
            {/* Connecting line — desktop */}
            <div className="absolute left-0 right-0 top-[3.25rem] hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent lg:block" />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="relative flex flex-col items-center text-center">
                    {/* Step number */}
                    <div className="relative z-10 mb-3 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-transform duration-150 hover:scale-105">
                      <Icon className="h-7 w-7" style={{ color: PRIMARY }} />
                      <span
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: PRIMARY }}
                      >
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{step.label}</h3>
                    <p className="mt-1 text-xs text-slate-500">{step.description}</p>

                    {/* Arrow between steps — mobile/tablet */}
                    {i < HOW_IT_WORKS.length - 1 && (
                      <ArrowUpRight className="mt-4 h-4 w-4 rotate-90 text-slate-300 sm:hidden" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------------- */}
      {/*  I. Footer                                                           */}
      {/* ------------------------------------------------------------------- */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Powered by{' '}
                <span className="text-amber-600">Flowmax</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Service Areas: Toronto, Mississauga, Brampton, Scarborough, Vaughan
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Phone className="h-3.5 w-3.5" />
              <span className="font-medium tabular-nums">647-642-8783</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
