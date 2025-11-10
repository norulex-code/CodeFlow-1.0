import React, { useState, useEffect, useRef } from 'react';
import { Account } from '../types';
import { useTotp } from '../hooks/useTotp';
import { TrashIcon, ClipboardIcon, CheckIcon, UserIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from './icons';

interface AccountCardProps {
    account: Account;
    onDelete: (id: string) => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ account, onDelete }) => {
    const { code, timeLeft, period } = useTotp(account.secret);
    const [codeCopied, setCodeCopied] = useState(false);
    const [usernameCopied, setUsernameCopied] = useState(false);
    const [passwordCopied, setPasswordCopied] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const prevCodeRef = useRef<string>();

    useEffect(() => {
        // Don't flash on initial load ('------') or on error ('Error')
        if (prevCodeRef.current && prevCodeRef.current !== code && !isNaN(parseInt(code))) {
            setIsRefreshing(true);
            const timer = setTimeout(() => setIsRefreshing(false), 700); // Duration matches animation
            return () => clearTimeout(timer);
        }
        prevCodeRef.current = code;
    }, [code]);

    const progress = (timeLeft / period) * 100;

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
        <div className="bg-gray-800 rounded-lg p-4 shadow-md flex flex-col justify-between relative overflow-hidden">
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
                               <button onClick={handleCopyUsername} className="p-1 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0" aria-label="Copy username">
                                   {usernameCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                               </button>
                            </div>
                        </div>
                    )}
                    {account.password && (
                         <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400 flex items-center"><LockClosedIcon className="w-4 h-4 mr-2" /> Senha:</span>
                             <div className="flex items-center gap-2">
                               <span className="font-mono text-gray-300">{showPassword ? account.password : '••••••••'}</span>
                               <button onClick={() => setShowPassword(!showPassword)} className="p-1 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                   {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                               </button>
                               <button onClick={handleCopyPassword} className="p-1 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0" aria-label="Copy password">
                                   {passwordCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                               </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className={`my-4 text-center rounded-lg ${isRefreshing ? 'animate-code-flash' : ''}`}>
                <p className="text-4xl font-mono tracking-widest text-cyan-400 py-2">
                    {code.slice(0, 3)} {code.slice(3, 6)}
                </p>
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
                            className="stroke-cyan-500"
                            strokeWidth="2"
                            strokeDasharray="100 100"
                            strokeDashoffset={100 - progress}
                            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                        ></circle>
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                        {timeLeft}
                    </span>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={handleCopyCode}
                        className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                        aria-label="Copy code"
                    >
                        {codeCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => onDelete(account.id)}
                        className="p-2 rounded-full hover:bg-red-800/50 text-red-400 transition-colors"
                        aria-label="Delete account"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountCard;