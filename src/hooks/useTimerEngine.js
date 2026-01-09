import { useState, useEffect, useRef, useCallback } from 'react';
import { useWakeLock } from './useWakeLock';

export function useTimerEngine() {
    const [targetTime, setTargetTime] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    const { requestWakeLock, releaseWakeLock } = useWakeLock();

    const audioContextRef = useRef(null);
    const oscillatorRef = useRef(null);

    // Initialize Audio Logic (Must be called on user interaction)
    const initAudio = () => {
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioContextRef.current = new AudioContext();
            }
        }
        // Resume if suspended (iOS policy)
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    const playBeep = () => {
        if (!audioContextRef.current) return;

        try {
            const ctx = audioContextRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.error("Audio Play Error", e);
        }
    };

    const notifyUser = () => {
        // 1. Audio
        playBeep();

        // 2. Browser Notification
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Tiempo Terminado", {
                body: "¡Tu descanso ha terminado! A entrenar.",
                icon: "/icon.png", // Make sure this exists later
                vibrate: [200, 100, 200]
            });
        }
    };

    const startTimer = useCallback((seconds) => {
        initAudio();

        // Request Notification permission if needed
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        const now = Date.now();
        const durationMs = seconds * 1000;
        const newTarget = now + durationMs;

        setTargetTime(newTarget);
        setIsRunning(true);
        requestWakeLock();
    }, [requestWakeLock]);

    const stopTimer = useCallback(() => {
        setIsRunning(false);
        setTargetTime(null);
        setTimeLeft(0);
        releaseWakeLock();
    }, [releaseWakeLock]);

    const addTime = useCallback((seconds) => {
        if (isRunning && targetTime) {
            setTargetTime(prev => prev + (seconds * 1000));
        } else {
            startTimer(seconds);
        }
    }, [isRunning, targetTime, startTimer]);

    // The Loop
    useEffect(() => {
        if (!isRunning || !targetTime) {
            setTimeLeft(0);
            return;
        }

        const checkTime = () => {
            const now = Date.now();
            const remaining = targetTime - now;

            if (remaining <= 0) {
                setTimeLeft(0);
                setIsRunning(false);
                setTargetTime(null);
                releaseWakeLock();
                notifyUser();
            } else {
                setTimeLeft(remaining);
                requestAnimationFrame(checkTime);
            }
        };

        const animFrame = requestAnimationFrame(checkTime);
        return () => cancelAnimationFrame(animFrame);
    }, [isRunning, targetTime, releaseWakeLock]);

    // Formatter
    const formattedTime = () => {
        const totalSeconds = Math.ceil(timeLeft / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    return {
        timeLeft,
        formattedTime: formattedTime(),
        isRunning,
        startTimer,
        stopTimer,
        addTime
    };
}
