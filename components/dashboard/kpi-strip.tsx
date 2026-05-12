'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { Phone, CalendarCheck, AlertCircle, Bot } from 'lucide-react';
import type { Call } from '@/types';

interface KpiStripProps {
  calls: Call[];
  loading?: boolean;
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    });
    const unsubscribe = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, motionValue, rounded]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

export function KpiStrip({ calls, loading }: KpiStripProps) {
  const totalCalls = calls.length;
  const booked = calls.filter((c) => c.outcome === 'booked').length;
  const needsFollowUp = calls.filter(
    (c) => c.outcome === 'follow_up' || c.outcome === 'missed'
  ).length;
  const completed = calls.filter((c) => c.status === 'completed').length;
  const answerRate = totalCalls > 0 ? Math.round((completed / totalCalls) * 100) : 0;

  const kpis = [
    {
      label: 'Total Calls',
      value: totalCalls,
      suffix: '',
      icon: Phone,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'Jobs Booked',
      value: booked,
      suffix: '',
      icon: CalendarCheck,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-100',
    },
    {
      label: 'Needs Follow-up',
      value: needsFollowUp,
      suffix: '',
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      label: 'AI Answer Rate',
      value: answerRate,
      suffix: '%',
      icon: Bot,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-white/60 p-4 animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <motion.div
            key={kpi.label}
            variants={itemVariants}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={`rounded-xl border ${kpi.border} ${kpi.bg} p-4 transition-shadow duration-200 hover:shadow-sm`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                {kpi.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>
              <AnimatedNumber value={kpi.value} suffix={kpi.suffix} />
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
