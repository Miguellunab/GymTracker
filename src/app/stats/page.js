"use client";

export default function StatsPage() {
    return (
        <main className="min-h-screen p-4 flex flex-col gap-8 max-w-lg mx-auto">
            <header className="flex justify-between items-end mt-4 px-2">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                        Stats
                    </h1>
                    <p className="text-zinc-500 text-sm font-medium">Track your progress.</p>
                </div>
            </header>
            <div className="text-center py-16">
                <p className="text-zinc-400">No stats available yet.</p>
            </div>
        </main>
    );
}
