import React, { useState } from 'react';
import { XMarkIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ArrowDownTrayIcon } from './icons';

interface ExportModalProps {
    onClose: () => void;
    onExport: (password: string) => Promise<void>;
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose, onExport }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await onExport(password);
            // O fechamento do modal é tratado no componente App após o sucesso do download
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro desconhecido.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-md shadow-xl text-white">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Exportar Dados</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-gray-300">
                        Para sua segurança, por favor, insira sua senha para confirmar a exportação. Um arquivo JSON criptografado será baixado.
                    </p>
                    <div>
                        <label htmlFor="export-password" className="block text-sm font-medium text-gray-300 mb-1">Sua Senha</label>
                        <div className="relative">
                            <LockClosedIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="export-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="Sua senha atual"
                                required
                                autoFocus
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(s => !s)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <div className="flex gap-2 pt-4">
                        <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                             <ArrowDownTrayIcon className="w-5 h-5" />
                            {isLoading ? 'Exportando...' : 'Confirmar e Exportar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExportModal;