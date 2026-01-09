self.onmessage = function(e) {
    const { action, payload } = e.data;

    if (action === 'START') {
        const targetTime = payload;
        
        // Limpiar timer anterior si existe
        if (self.timerInterval) clearInterval(self.timerInterval);

        self.timerInterval = setInterval(() => {
            const now = Date.now();
            const remaining = targetTime - now;

            if (remaining <= 0) {
                self.postMessage({ type: 'DONE' });
                clearInterval(self.timerInterval);
            } else {
                self.postMessage({ type: 'TICK', timeLeft: remaining });
            }
        }, 100); // 100ms precisión
    } 
    
    if (action === 'STOP') {
        if (self.timerInterval) clearInterval(self.timerInterval);
    }
};