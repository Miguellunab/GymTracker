import { useState, useEffect, useRef, useCallback } from 'react';
import { useWakeLock } from './useWakeLock';

export function useTimerEngine() {
    const [targetTime, setTargetTime] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    const { requestWakeLock, releaseWakeLock } = useWakeLock();

    // HACk: Silent Audio for iOS Background
    const silentAudioRef = useRef(null);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
            audio.loop = true;
            audio.volume = 0.01;
            silentAudioRef.current = audio;
        }
    }, []);

    const audioContextRef = useRef(null);
    const oscillatorRef = useRef(null);

    // Initialize Audio Logic (Must be called on user interaction)
    const initAudio = useCallback(() => {
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
    }, []);

    const playBeep = useCallback(() => {
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
    }, []);

    const notifyUser = useCallback(() => {
        // 1. Audio
        playBeep();

        // 2. Browser Notification
        if ("Notification" in window && Notification.permission === "granted") {
            try {
               new Notification("Tiempo Terminado", {
                    body: "¡Tu descanso ha terminado! A entrenar.",
                    icon: "/icon.png", 
                    vibrate: [200, 100, 200],
                    requireInteraction: true
                });
            } catch (e) {
                console.error("Notification Error", e);
            }
        }
    }, [playBeep]);

    const workerRef = useRef(null);

    // Initialize Worker
    useEffect(() => {
        workerRef.current = new Worker('/timer-worker.js');
        
        workerRef.current.onmessage = (e) => {
            const { type, timeLeft: workerTimeLeft } = e.data;
            
            if (type === 'TICK') {
                setTimeLeft(workerTimeLeft);
            } else if (type === 'DONE') {
                setTimeLeft(0);
                setIsRunning(false);
                setTargetTime(null);
                releaseWakeLock();
                if(silentAudioRef.current) { silentAudioRef.current.pause(); silentAudioRef.current.currentTime = 0; }
                notifyUser();
            }
        };

        return () => {
            if (workerRef.current) workerRef.current.terminate();
        };
    }, [releaseWakeLock, notifyUser]);

    const startTimer = useCallback((seconds) => {
        initAudio();
        
        // Play silent audio to keep background alive
        if(silentAudioRef.current) {
            silentAudioRef.current.play().catch(e => console.log("Audio play failed", e));
        }

        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        const now = Date.now();
        const durationMs = seconds * 1000;
        const newTarget = now + durationMs;

        setTargetTime(newTarget);
        setIsRunning(true);
        requestWakeLock();

        // Start Worker
        if (workerRef.current) {
            workerRef.current.postMessage({ action: 'START', payload: newTarget });
        }

    }, [requestWakeLock]);

    const stopTimer = useCallback(() => {
        setIsRunning(false);
        if(silentAudioRef.current) { silentAudioRef.current.pause(); silentAudioRef.current.currentTime = 0; }
        setTargetTime(null);
        setTimeLeft(0);
        releaseWakeLock();
        // Stop Worker
         if (workerRef.current) {
            workerRef.current.postMessage({ action: 'STOP' });
        }
    }, [releaseWakeLock]);

    const addTime = useCallback((seconds) => {
        // Complex logic: need to get current target from state which might be stale in a callback?
        // Fortunately setTargetTime supports functional update. But we need the value for the worker.
        // We can use a ref to track currentTargetTime to avoid dependency loops or just use the state variable.
        // But addTime depends on targetTime.
        
        let newTarget;
        if (isRunning && targetTime) {
            newTarget = targetTime + (seconds * 1000);
            setTargetTime(newTarget);
        } else {
            const now = Date.now();
            newTarget = now + (seconds * 1000);
            setTargetTime(newTarget);
            setIsRunning(true);
            requestWakeLock();
            initAudio(); // Ensure audio context is ready
             if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
            }
        }

        if (workerRef.current) {
            workerRef.current.postMessage({ action: 'START', payload: newTarget });
        }
    }, [isRunning, targetTime, requestWakeLock, startTimer]); // Added startTimer for safety but logic is inline now to ensure variable access
    
    // Remove the old useEffect loop
    
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