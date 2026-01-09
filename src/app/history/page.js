"use client";

export default function HistoryPage() {
    return (
        <main className="min-h-screen p-4 flex flex-col gap-8 max-w-lg mx-auto">
            <header className="flex justify-between items-end mt-4 px-2">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                        History
                    </h1>
                    <p className="text-zinc-500 text-sm font-medium">Review your past workouts.</p>
                </div>
            </header>
            <div className="text-center py-16">
                <p className="text-zinc-400">No workouts logged yet.</p>
            </div>
        </main>
    );
}
