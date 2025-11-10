import React, { useState } from 'react';
import { LockClosedIcon, EyeIcon, EyeSlashIcon, EnvelopeIcon, Cog6ToothIcon, ArrowLeftIcon } from './icons';
import { deleteUser, userExists, getAdminUser } from '../services/storageService';

interface AuthScreenProps {
    onLogin: (email: string, password: string) => Promise<void>;
    onRegister: (email: string, password: string) => Promise<void>;
    onAdminLogin: (email: string, password: string) => Promise<void>;
    error: string | null;
}

type View = 'login' | 'register' | 'admin';

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister, onAdminLogin, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [view, setView] = useState<View>('login');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    const clearForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setLocalError(null);
        setNotification(null);
    }
    
    const switchView = (newView: View) => {
        clearForm();
        setView(newView);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setLocalError(null);
        setNotification(null);

        try {
            if (view === 'login') {
                await onLogin(email, password);
            } else if (view === 'admin') {
                await onAdminLogin(email, password);
            } else { // register
                const adminEmail = getAdminUser();
                if (adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
                    setLocalError("Este email é reservado.");
                    setIsLoading(false);
                    return;
                }
                if (password !== confirmPassword) {
                    setLocalError("As senhas não coincidem.");
                    setIsLoading(false);
                    return;
                }
                 if (password.length < 8) {
                    setLocalError("A senha deve ter pelo menos 8 caracteres.");
                    setIsLoading(false);
                    return;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    setLocalError("Por favor, insira um email válido.");
                    setIsLoading(false);
                    return;
                }
                await onRegister(email, password);
            }
        } catch (err) {
            // Error is handled by the parent component, just stop loading
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleForgotPassword = () => {
        setLocalError(null);
        setNotification(null);

        if (!email.trim()) {
            setLocalError('Por favor, digite seu email para resetar a senha.');
            return;
        }

        if (!userExists(email)) {
            setLocalError('Usuário não encontrado.');
            return;
        }

        const confirmation = window.confirm(
            `Tem certeza que deseja resetar a conta para o usuário "${email}"?\n\nTodos os dados, incluindo suas contas 2FA, serão permanentemente apagados. Esta ação não pode ser desfeita.`
        );

        if (confirmation) {
            deleteUser(email);
            setNotification('Conta resetada com sucesso. Por favor, registre-se novamente com uma nova senha.');
            switchView('register');
        }
    };

    const passwordInput = (value: string, setter: React.Dispatch<React.SetStateAction<string>>, placeholder: string, id: string, autoComplete: string) => (
         <div className="relative">
            <input
                type={showPassword ? 'text' : 'password'}
                id={id}
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-4 pr-10 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder={placeholder}
                required
                autoComplete={autoComplete}
            />
             <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
        </div>
    );

    const titles: Record<View, string> = {
        login: 'CodeFlow Authenticator',
        register: 'Criar Nova Conta',
        admin: 'Acesso Administrativo',
    };

    const descriptions: Record<View, string> = {
        login: 'Faça login para acessar suas contas.',
        register: 'Crie uma conta para começar.',
        admin: 'Login para gerenciar usuários.',
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-lg">
                <div className="text-center">
                    <LockClosedIcon className="mx-auto h-12 w-12 text-cyan-400" />
                    <h2 className="mt-6 text-3xl font-extrabold text-white">
                        {titles[view]}
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                       {descriptions[view]}
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                     <div className="relative">
                        <EnvelopeIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Email"
                            required
                            autoComplete="email"
                        />
                    </div>
                   
                    {passwordInput(password, setPassword, "Senha", "password", view === 'register' ? "new-password" : "current-password")}

                    {view === 'register' && passwordInput(confirmPassword, setConfirmPassword, "Confirmar Senha", "confirm-password", "new-password")}
                    
                    {view === 'login' && (
                        <div className="flex items-center justify-end text-sm">
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="font-medium text-cyan-400 hover:text-cyan-300"
                            >
                                Esqueceu a senha?
                            </button>
                        </div>
                    )}

                    {(error || localError) && <p className="text-red-400 text-sm text-center -my-2">{error || localError}</p>}
                    {notification && <p className="text-green-400 text-sm text-center -my-2">{notification}</p>}
                    
                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-colors disabled:bg-cyan-800 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Carregando...' : (view === 'register' ? 'Registrar' : 'Entrar')}
                        </button>
                    </div>
                     <div className="text-sm text-center space-y-2">
                        {view === 'login' && (
                            <button type="button" onClick={() => switchView('register')} className="font-medium text-cyan-400 hover:text-cyan-300">
                                Não tem uma conta? Registre-se
                            </button>
                        )}
                         {view === 'register' && (
                            <button type="button" onClick={() => switchView('login')} className="font-medium text-cyan-400 hover:text-cyan-300">
                                Já tem uma conta? Entre
                            </button>
                        )}
                        {view === 'admin' ? (
                            <button type="button" onClick={() => switchView('login')} className="font-medium text-gray-400 hover:text-gray-200 flex items-center justify-center w-full">
                                <ArrowLeftIcon className="w-4 h-4 mr-2"/> Voltar para Login de Usuário
                            </button>
                        ) : (
                             <button type="button" onClick={() => switchView('admin')} className="font-medium text-gray-400 hover:text-gray-200 flex items-center justify-center w-full pt-2">
                                <Cog6ToothIcon className="w-4 h-4 mr-2" /> Acesso Administrativo
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AuthScreen;