import React, { useState } from 'react';
import { XMarkIcon, EnvelopeIcon, LockClosedIcon } from './icons';
import { loadUser, updateUserEmail, saveAccounts, userExists } from '../services/storageService';
import { deriveKey } from '../services/cryptoService';

interface UserData {
    salt: string;
    email: string;
}

interface EditUserModalProps {
    user: UserData;
    onClose: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose }) => {
    const [newEmail, setNewEmail] = useState(user.email);
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        let emailChanged = false;
        let finalEmail = user.email;

        try {
            // Alterar email
            if (newEmail !== user.email) {
                if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
                    throw new Error("Por favor, insira um email válido.");
                }
                if (userExists(newEmail)) {
                    throw new Error("Este email já está em uso por outro usuário.");
                }
                const emailUpdated = updateUserEmail(user.email, newEmail);
                if (!emailUpdated) {
                    throw new Error("Não foi possível atualizar o email.");
                }
                finalEmail = newEmail;
                emailChanged = true;
            }

            // Redefinir senha
            if (newPassword) {
                if (newPassword.length < 8) {
                    throw new Error("A nova senha deve ter pelo menos 8 caracteres.");
                }

                const confirmation = window.confirm(
                    `Você está prestes a redefinir a senha para ${finalEmail}.\n\nAVISO: Esta ação irá apagar TODAS as contas 2FA deste usuário. Ele(a) precisará adicioná-las novamente.\n\nDeseja continuar?`
                );
                
                if (confirmation) {
                    const userData = loadUser(finalEmail);
                    if (userData) {
                        const salt = new Uint8Array(userData.salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
                        const newKey = await deriveKey(newPassword, salt);
                        await saveAccounts([], newKey, finalEmail); // Salva uma lista vazia, efetivamente resetando as contas
                    }
                } else {
                     // Se o usuário cancelou o reset de senha, mas o email já foi mudado
                    if(emailChanged) {
                        setSuccess('Email alterado com sucesso. A redefinição de senha foi cancelada.');
                    }
                    setIsLoading(false);
                    return;
                }
            }

            let successMessage = "";
            if (emailChanged && newPassword) {
                successMessage = "Email e senha atualizados com sucesso!";
            } else if (emailChanged) {
                successMessage = "Email atualizado com sucesso!";
            } else if (newPassword) {
                successMessage = "Senha redefinida com sucesso!";
            } else {
                 setError("Nenhuma alteração foi feita.");
                 setIsLoading(false);
                 return;
            }
            
            setSuccess(successMessage);
            setTimeout(() => {
                onClose();
            }, 2000);

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
                    <h2 className="text-xl font-bold">Editar Usuário</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="user-email" className="block text-sm font-medium text-gray-300 mb-1">Email do Usuário</label>
                         <div className="relative">
                            <EnvelopeIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                id="user-email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                required
                            />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-300 mb-1">Nova Senha (deixe em branco para não alterar)</label>
                         <div className="relative">
                            <LockClosedIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="password"
                                id="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 8 caracteres"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                        {newPassword && <p className="text-xs text-yellow-400 mt-2">Atenção: Redefinir a senha irá apagar todas as contas 2FA do usuário.</p>}
                    </div>
                    
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    {success && <p className="text-green-400 text-sm text-center">{success}</p>}

                    <div className="flex gap-2 pt-4">
                         <button type="button" onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-cyan-800 disabled:cursor-not-allowed">
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;