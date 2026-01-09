"use client";

import { addDays, subDays, format, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardCalendar({ selectedDate, onSelectDate }) { // removed history prop
    const router = useRouter();
    const scrollRef = useRef(null);
    const [calendarData, setCalendarData] = useState({});
    const [weightLogs, setWeightLogs] = useState([]);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [modalDate, setModalDate] = useState(null);
    const [mounted, setMounted] = useState(false);

    // Fetch Calendar Data
    const fetchData = async () => {
        try {
            const res = await fetch('/api/calendar');
            if (res.ok) {
                const data = await res.json();
                setCalendarData(data || {});
            }

            const resWeight = await fetch('/api/weight');
            if (resWeight.ok) {
                const dataWeight = await resWeight.json();
                if (Array.isArray(dataWeight)) {
                    setWeightLogs(dataWeight);
                }
            }
        } catch (e) {
            console.error("Calendar load failed", e);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, []);

    useEffect(() => {
        if (mounted && scrollRef.current) {
            scrollRef.current.scrollLeft = 300;
        }
    }, [mounted]);

    if (!mounted) return <div className="h-24 w-full bg-zinc-900/50 animate-pulse rounded-xl mb-4" />;


    // Helper to refresh from outside if needed (could export context, but simple reload works for now)
    
    const handleDayClick = (date) => {
        setModalDate(date);
        setShowStatusModal(true);
        // also propagate selection
        if(onSelectDate) onSelectDate(date);
    };

    const handleUpdateStatus = async (type) => {
        if (!modalDate) return;
        const dateStr = format(modalDate, 'yyyy-MM-dd');
        
        if (type !== 'DELETE' && type !== 'Descanso') {
            router.push(`/workout/start?routine=${encodeURIComponent(type)}&date=${dateStr}`);
            return;
        }

        try {
            if (type === 'DELETE') {
                 await fetch(`/api/calendar?date=${dateStr}`, { method: 'DELETE' });
            } else {
                 await fetch('/api/calendar', {
                    method: 'POST',
                    body: JSON.stringify({ date: dateStr, type }),
                 });
            }
            await fetchData(); // Refresh
            setShowStatusModal(false);
        } catch (e) {
            alert("Error updating status");
        }
    };

    const getStatusColor = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const entry = calendarData[dateStr];
        
        // Weight Check
        const hasWeight = weightLogs.some(l => format(new Date(l.date), 'yyyy-MM-dd') === dateStr);
        if (hasWeight) return "bg-yellow-900/30 text-yellow-500 border-yellow-800 ring-1 ring-yellow-500/50";

        if (isToday(date) && !entry) return "bg-white text-black border-emerald-500 ring-2 ring-emerald-500 ring-offset-2 ring-offset-black";
        
        if (!entry) return "bg-zinc-900 text-zinc-600 border-zinc-800"; // Empty status

        const type = entry.title;
        if (type === "Pierna") return "bg-red-900/80 text-red-100 border-red-700 shadow-[0_0_15px_rgba(220,38,38,0.3)]";
        if (type === "Pecho / Espalda") return "bg-blue-900/80 text-blue-100 border-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.3)]";
        if (type === "Brazos") return "bg-purple-900/80 text-purple-100 border-purple-700 shadow-[0_0_15px_rgba(147,51,234,0.3)]";
        if (type === "Descanso") return "bg-emerald-900/50 text-emerald-400 border-emerald-800";
        
        return "bg-zinc-800 text-zinc-300"; // Fallback
    };

    const days = Array.from({ length: 14 }, (_, i) => subDays(new Date(), 7 - i));

    return (
        <>
        <div className="w-full overflow-x-auto no-scrollbar pb-4" ref={scrollRef}>
            <div className="flex gap-3 px-4 w-max">
                {days.map((date, i) => {
                    const statusClass = getStatusColor(date);
                    const isSelected = isSameDay(date, selectedDate);
                    return (
                        <button 
                            key={i}
                            onClick={() => handleDayClick(date)}
                            className={cn(
                                "flex flex-col items-center justify-center w-14 h-20 rounded-2xl border transition-all duration-300 snap-center shrink-0",
                                statusClass,
                                isSelected ? "scale-110 translate-y-[-4px]" : "scale-100"
                            )}
                        >
                             <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                                {format(date, 'EEE', { locale: es }).replace('.', '')}
                            </span>
                            <span className="text-xl font-black font-sans">
                                {format(date, 'd')}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Mini Modal for Quick Status Change */}
        {showStatusModal && modalDate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowStatusModal(false)}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-xs space-y-3" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold capitalize flex-1 text-center pl-6">{format(modalDate, 'EEEE d', { locale: es })}</h3>
                        <button onClick={() => setShowStatusModal(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                    </div>
                    
                    <button onClick={() => handleUpdateStatus('Pecho / Espalda')} className="w-full p-3 rounded-xl bg-blue-900/40 text-blue-200 border border-blue-800 font-bold text-sm">Pecho / Espalda</button>
                    <button onClick={() => handleUpdateStatus('Pierna')} className="w-full p-3 rounded-xl bg-red-900/40 text-red-200 border border-red-800 font-bold text-sm">Pierna</button>
                    <button onClick={() => handleUpdateStatus('Brazos')} className="w-full p-3 rounded-xl bg-purple-900/40 text-purple-200 border border-purple-800 font-bold text-sm">Brazos</button>
                    <button onClick={() => handleUpdateStatus('Descanso')} className="w-full p-3 rounded-xl bg-emerald-900/40 text-emerald-200 border border-emerald-800 font-bold text-sm">Descanso</button>
                    
                    <div className="h-px bg-zinc-800 my-2"></div>
                    
                    <button onClick={() => handleUpdateStatus('DELETE')} className="w-full p-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-sm flex justify-center gap-2">
                        <X className="w-4 h-4"/> Limpiar Día
                    </button>
                </div>
            </div>
        )}
        </>
    );
}