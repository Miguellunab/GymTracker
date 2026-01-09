import { useRef, useCallback, useEffect } from 'react';

export function useWakeLock() {
    const wakeLock = useRef(null);
    const isLocked = useRef(false);

    const requestWakeLock = useCallback(async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLock.current = await navigator.wakeLock.request('screen');
                isLocked.current = true;
                // console.log('Wake Lock active');
            } catch (err) {
                console.warn(`Wake Lock Error: ${err.name}, ${err.message}`);
                isLocked.current = false;
            }
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLock.current) {
            try {
                await wakeLock.current.release();
                wakeLock.current = null;
                isLocked.current = false;
            } catch (err) {
                console.warn(`Wake Lock Release Error: ${err.name}, ${err.message}`);
            }
        }
        isLocked.current = false; // Ensure state is correct even if release fails
    }, []);

    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && isLocked.current) {
                // If the tab becomes visible and we expect it to be locked, re-request
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleVisibilityChange); // Also for fullscreen

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleVisibilityChange);
        };
    }, [requestWakeLock]);

    return { requestWakeLock, releaseWakeLock };
}
