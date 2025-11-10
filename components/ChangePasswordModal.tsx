import React, { useState } from 'react';
import { XMarkIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from './icons';

interface ChangePasswordModalProps {
    onClose: () => void;
    onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose, onChangePassword }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword !== confirmPassword) {
            setError("As novas senhas não coincidem.");
            return;
        }
        if (newPassword.length < 8) {
            setError("A nova senha deve ter pelo menos 8 caracteres.");
            return;
        }
        if (currentPassword === newPassword) {
            setError("A nova senha deve ser diferente da senha atual.");
            return;
        }

        setIsLoading(true);
        try {
            await onChangePassword(currentPassword, newPassword);
            setSuccess("Senha alterada com sucesso!");
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro desconhecido.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const passwordInput = (
        value: string, 
        setter: React.Dispatch<React.SetStateAction<string>>, 
        placeholder: string, 
        id: string, 
        autoComplete: string,
        show: boolean,
        toggleShow: () => void
    ) => (
         <div className="relative">
            <LockClosedIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
                type={show ? 'text' : 'password'}
                id={id}
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder={placeholder}
                required
                autoComplete={autoComplete}
            />
             <button
                type="button"
                onClick={toggleShow}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                aria-label={show ? 'Hide password' : 'Show password'}
            >
                {show ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-md shadow-xl text-white">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Alterar Senha</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                {!success ? (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label htmlFor="current-password" className="block text-sm font-medium text-gray-300 mb-1">Senha Atual</label>
                            {passwordInput(currentPassword, setCurrentPassword, "Sua senha atual", "current-password", "current-password", showCurrentPassword, () => setShowCurrentPassword(s => !s))}
                        </div>
                        <div>
                            <label htmlFor="new-password" className="block text-sm font-medium text-gray-300 mb-1">Nova Senha</label>
                            {passwordInput(newPassword, setNewPassword, "Mínimo 8 caracteres", "new-password", "new-password", showNewPassword, () => setShowNewPassword(s => !s))}
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">Confirmar Nova Senha</label>
                            {passwordInput(confirmPassword, setConfirmPassword, "Repita a nova senha", "confirm-password", "new-password", showNewPassword, () => setShowNewPassword(s => !s))}
                        </div>
                        
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                        <div className="flex gap-2 pt-4">
                            <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" disabled={isLoading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-cyan-800 disabled:cursor-not-allowed">
                                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="p-6 text-center">
                        <p className="text-green-400 text-lg">{success}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChangePasswordModal;
