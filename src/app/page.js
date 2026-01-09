"use client";

import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { enUS } from 'date-fns/locale'; // MOCK_ROUTINES keys are in English
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import DayRoutineCard from '@/components/dashboard/DayRoutineCard';
import { MOCK_ROUTINES } from '@/lib/data';
import { History, TrendingUp, Scale, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [date, setDate] = useState(new Date());

  // Get day string for mock lookup (Monday, Tuesday...)
  // Note: MOCK_ROUTINES keys are still in English ("Monday") because I didn't change the keys in data.js, only values.
  const dayNameKey = format(date, 'EEEE', { locale: enUS });
  const routine = MOCK_ROUTINES[dayNameKey];
  
  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <header className="pt-8 px-4 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-zinc-500 font-medium text-sm uppercase tracking-wider">Bienvenido, Miguel</p>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            </div>
            <div className="h-10 w-10 rounded-full border border-zinc-700 overflow-hidden relative">
                 <img src="/profile.jpg" alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
      </header>

      {/* Calendar Strip */}
      <section className="mb-8">
         <DashboardCalendar 
            selectedDate={date} 
            onSelectDate={setDate}
         />
      </section>

      {/* Main Action Card */}
      <section className="mb-8">
         <DayRoutineCard 
            dayName={format(date, 'EEEE', { locale: enUS })}
            routineName={routine?.name}
         />
      </section>

      {/* Quick Stats / History access */}
      <section className="px-4 grid grid-cols-2 gap-3">
          <Link href="/history" className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center gap-2 hover:bg-zinc-800 transition-colors">
               <History className="w-8 h-8 text-emerald-500" />
               <span className="text-sm font-bold text-zinc-300">Historial</span>
          </Link>
           <Link href="/profile" className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center gap-2 hover:bg-zinc-800 transition-colors">
               <Scale className="w-8 h-8 text-blue-500" />
               <span className="text-sm font-bold text-zinc-300">Tu Peso</span>
          </Link>
      </section>
    </div>
  );
}