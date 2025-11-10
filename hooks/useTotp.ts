import { useState, useEffect, useRef } from 'react';
import { generateTOTP } from '../services/totpService';

export const useTotp = (secret: string) => {
    const [code, setCode] = useState<string>('------');
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const period = 30;
    const currentCounter = useRef<number | null>(null);

    useEffect(() => {
        const update = async () => {
            try {
                const newCode = await generateTOTP(secret);
                setCode(newCode);
            } catch (error) {
                console.error("Failed to generate TOTP:", error);
                setCode("Error");
            }
        };

        const timer = setInterval(() => {
            const epoch = Math.floor(Date.now() / 1000);
            const newTimeLeft = period - (epoch % period);
            setTimeLeft(newTimeLeft);

            const newCounter = Math.floor(epoch / period);

            // Se o contador mudou, é hora de gerar um novo código.
            // Esta é uma maneira mais robusta do que `if (newTimeLeft === period)`.
            if (currentCounter.current !== null && currentCounter.current !== newCounter) {
                update();
            }
            
            // Atualiza a ref com o novo valor do contador.
            currentCounter.current = newCounter;
        }, 1000);
        
        // Atualização inicial
        const initialEpoch = Math.floor(Date.now() / 1000);
        setTimeLeft(period - (initialEpoch % period));
        currentCounter.current = Math.floor(initialEpoch / period);
        update();

        return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secret]);

    return { code, timeLeft, period };
};