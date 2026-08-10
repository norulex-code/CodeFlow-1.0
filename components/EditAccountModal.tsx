import React, { useState } from 'react';
import { Account } from '../types';
import { XMarkIcon, InformationCircleIcon } from './icons';

interface EditAccountModalProps {
    account: Account;
    onClose: () => void;
    onSave: (updatedAccount: Account) => void;
    existingAccounts: Account[];
}

const EditAccountModal: React.FC<EditAccountModalProps> = ({ account, onClose, onSave, existingAccounts }) => {
    const [issuer, setIssuer] = useState(account.issuer);
    const [name, setName] = useState(account.name);
    const [username, setUsername] = useState(account.username || '');
    const [password, setPassword] = useState(account.password || '');
    const [error, setError] = useState<string | null>(null);

    const isDuplicate = () => {
        const currentIssuer = issuer.trim() || name.trim();
        return existingAccounts.some(acc => acc.id !== account.id && acc.issuer === currentIssuer && acc.name === name.trim());
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Nome da conta é obrigatório.");
            return;
        }

        const updatedAccount: Account = {
            ...account,
            issuer: issuer.trim() || name.trim(),
            name: name.trim(),
            username: username.trim() ? username.trim() : undefined,
            password: password ? password : undefined,
        };

        onSave(updatedAccount);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-md shadow-xl text-white">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Editar Conta</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="edit-issuer" className="block text-sm font-medium text-gray-300 mb-1">Emissor</label>
                        <input type="text" id="edit-issuer" value={issuer} onChange={e => setIssuer(e.target.value)} placeholder="Ex: Google" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div>
                        <label htmlFor="edit-name" className="block text-sm font-medium text-gray-300 mb-1">Nome da Conta</label>
                        <input type="text" id="edit-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: email@example.com" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
                        {isDuplicate() && (
                            <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                                <InformationCircleIcon className="w-3 h-3" />
                                Uma conta com este emissor e nome já existe. Ela será renomeada automaticamente ao salvar.
                            </p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="edit-username" className="block text-sm font-medium text-gray-300 mb-1">Nome de Usuário (Opcional)</label>
                        <input type="text" id="edit-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Seu usuário para este serviço" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" autoComplete="username" />
                    </div>
                    <div>
                        <label htmlFor="edit-password" className="block text-sm font-medium text-gray-300 mb-1">Senha (Opcional)</label>
                        <input type="password" id="edit-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha para este serviço" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" autoComplete="current-password" />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <div className="flex gap-2 pt-4">
                        <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditAccountModal;