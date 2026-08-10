import React, { useState, useEffect, useRef } from 'react';
import { Account } from '../types';
import { useTotp } from '../hooks/useTotp';
import Tooltip from './Tooltip';
import { TrashIcon, ClipboardIcon, CheckIcon, UserIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, PencilIcon } from './icons';

interface AccountCardProps {
    account: Account;
    onDelete: (id: string) => void;
    onEdit: (account: Account) => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ account, onDelete, onEdit }) => {
    const { code, timeLeft, period } = useTotp(account.secret);
    const [codeCopied, setCodeCopied] = useState(false);
    const [usernameCopied, setUsernameCopied] = useState(false);
    const [passwordCopied, setPasswordCopied] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const prevCodeRef = useRef<string>();

    const isCritical = timeLeft <= 5 && timeLeft > 0;
    const isReset = timeLeft === period;

    useEffect(() => {
        if (prevCodeRef.current && prevCodeRef.current !== code && !isNaN(parseInt(code))) {
            setIsRefreshing(true);
            const timer = setTimeout(() => setIsRefreshing(false), 500);
            return () => clearTimeout(timer);
        }
        prevCodeRef.current = code;
    }, [code]);

    const progress = (timeLeft / period) * 100;
    const transitionClass = isReset ? 'transition-none' : 'transition-all duration-1000 ease-linear';

    const handleCopyCode = () => {
        navigator.clipboard.writeText(code.replace(/\s/g, ''));
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
    };

    const handleCopyUsername = () => {
        if (!account.username) return;
        navigator.clipboard.writeText(account.username);
        setUsernameCopied(true);
        setTimeout(() => setUsernameCopied(false), 2000);
    };

    const handleCopyPassword = () => {
        if (!account.password) return;
        navigator.clipboard.writeText(account.password);
        setPasswordCopied(true);
        setTimeout(() => setPasswordCopied(false), 2000);
    };

    return (
        <div className={`bg-gray-800 rounded-lg p-4 shadow-md flex flex-col justify-between relative overflow-hidden transition-colors duration-300 ${isCritical ? 'ring-1 ring-red-500/30' : ''}`}>
            <div>
                <p className="text-sm text-gray-400">{account.issuer}</p>
                <h3 className="text-lg font-semibold text-gray-200">{account.name}</h3>
            </div>

            {(account.username || account.password) && (
                <div className="my-3 space-y-2 border-t border-b border-gray-700 py-3">
                    {account.username && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400 flex items-center"><UserIcon className="w-4 h-4 mr-2" /> Usuário:</span>
                            <div className="flex items-center gap-2">
                               <span className="font-mono text-gray-300 break-all">{account.username}</span>
                               <Tooltip text={usernameCopied ? "Copiado!" : "Copiar Usuário"}>
                                    <button onClick={handleCopyUsername} className="p-1 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0" aria-label="Copy username">
                                        {usernameCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                                    </button>
                               </Tooltip>
                            </div>
                        </div>
                    )}
                    {account.password && (
                         <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400 flex items-center"><LockClosedIcon className="w-4 h-4 mr-2" /> Senha:</span>
                             <div className="flex items-center gap-2">
                               <span className="font-mono text-gray-300">{showPassword ? account.password : '••••••••'}</span>
                               <Tooltip text={showPassword ? "Ocultar Senha" : "Mostrar Senha"}>
                                    <button onClick={() => setShowPassword(!showPassword)} className="p-1 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                        {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                    </button>
                               </Tooltip>
                               <Tooltip text={passwordCopied ? "Copiado!" : "Copiar Senha"}>
                                    <button onClick={handleCopyPassword} className="p-1 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0" aria-label="Copy password">
                                        {passwordCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                                    </button>
                               </Tooltip>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="my-4 text-center rounded-lg relative">
                <p className={`text-4xl font-mono tracking-widest py-2 transition-all duration-300 
                    ${isRefreshing ? 'animate-code-refresh' : ''} 
                    ${isCritical ? 'text-red-500 animate-pulse-critical' : 'text-cyan-400'}`}>
                    {code.slice(0, 3)} {code.slice(3, 6)}
                </p>
                {isCritical && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold text-red-500 animate-pulse">
                        Expirando em breve
                    </span>
                )}

                {/* Subtle Linear Progress Bar under TOTP code */}
                <div className="w-full bg-gray-700/60 h-1.5 rounded-full overflow-hidden mt-1 relative">
                    <div
                        className={`h-full ${transitionClass} rounded-full ${
                            isCritical
                                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                                : 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.5)]'
                        }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="w-8 h-8 relative flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" className="stroke-gray-600" strokeWidth="2"></circle>
                        <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            className={`transition-all duration-300 ${isCritical ? 'stroke-red-500' : 'stroke-cyan-500'}`}
                            strokeWidth="2"
                            strokeDasharray="100 100"
                            strokeDashoffset={100 - progress}
                            style={{ transition: isReset ? 'none' : 'stroke-dashoffset 0.5s linear, stroke 0.3s ease' }}
                        ></circle>
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold transition-colors duration-300 ${isCritical ? 'text-red-500' : 'text-white'}`}>
                        {timeLeft}
                    </span>
                </div>
                <div className="flex space-x-2">
                    <Tooltip text="Editar Conta">
                        <button
                            onClick={() => onEdit(account)}
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                            aria-label="Editar conta"
                        >
                            <PencilIcon className="w-5 h-5" />
                        </button>
                    </Tooltip>
                    <Tooltip text={codeCopied ? "Copiado!" : "Copiar Código"}>
                        <button
                            onClick={handleCopyCode}
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                            aria-label="Copiar código"
                        >
                            {codeCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
                        </button>
                    </Tooltip>
                    <Tooltip text="Excluir Conta">
                        <button
                            onClick={() => onDelete(account.id)}
                            className="p-2 rounded-full hover:bg-red-800/50 text-red-400 transition-colors"
                            aria-label="Excluir conta"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* Subtle bottom edge timer line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/40 overflow-hidden">
                <div
                    className={`h-full ${transitionClass} ${
                        isCritical ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-cyan-400/80'
                    }`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export default AccountCard;