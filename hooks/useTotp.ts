
import { useState, useEffect } from 'react';
import { generateTOTP } from '../services/totpService';

export const useTotp = (secret: string) => {
    const [code, setCode] = useState<string>('------');
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const period = 30;

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
            const epoch = Math.round(new Date().getTime() / 1000.0);
            const newTimeLeft = period - (epoch % period);
            setTimeLeft(newTimeLeft);

            if (newTimeLeft === period) {
                update();
            }
        }, 1000);
        
        // Initial update
        const epoch = Math.round(new Date().getTime() / 1000.0);
        setTimeLeft(period - (epoch % period));
        update();

        return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secret]);

    return { code, timeLeft, period };
};
