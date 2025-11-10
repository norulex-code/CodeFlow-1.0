import React, { useState, useEffect, useCallback } from 'react';
import { Account } from './types';
import { loadAccounts, saveAccounts, userExists, loadUser, saveUser } from './services/storageService';
import { deriveKey, generateSalt } from './services/cryptoService';
import AccountList from './components/AccountList';
import AuthScreen from './components/AuthScreen';
import AddAccountModal from './components/AddAccountModal';
import { PlusIcon, ArrowRightOnRectangleIcon, MagnifyingGlassIcon } from './components/icons';

const App: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleLogin = async (email: string, password: string): Promise<void> => {
        setError(null);
        if (!userExists(email)) {
            setError('Usuário não encontrado.');
            throw new Error('User not found');
        }
        try {
            const userData = loadUser(email);
            if (!userData) {
                setError('Dados do usuário não encontrados.');
                throw new Error('User data not found');
            }
            const salt = new Uint8Array(userData.salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

            const key = await deriveKey(password, salt);
            const decryptedAccounts = await loadAccounts(key, email);
            setMasterKey(key);
            setAccounts(decryptedAccounts);
            setCurrentUser(email);
        } catch (err) {
            console.error('Failed to login:', err);
            setError('Senha incorreta ou os dados estão corrompidos.');
            throw err;
        }
    };
    
    const handleRegister = async (email: string, password: string) => {
        setError(null);
        if (userExists(email)) {
            setError('Este email já está em uso.');
            throw new Error('Email already exists');
        }
        try {
            const { salt, saltHex } = generateSalt();
            saveUser(email, saltHex);
            const key = await deriveKey(password, salt);
            await saveAccounts([], key, email);
            setMasterKey(key);
            setAccounts([]);
            setCurrentUser(email);
        } catch (err) {
            console.error('Failed to register:', err);
            setError('Não foi possível registrar o usuário.');
            throw err;
        }
    };

    const persistAccounts = useCallback(async (updatedAccounts: Account[]) => {
        if (!masterKey || !currentUser) return;
        try {
            await saveAccounts(updatedAccounts, masterKey, currentUser);
        } catch (err) {
            console.error('Failed to save accounts:', err);
            setError('Falha ao salvar contas.');
        }
    }, [masterKey, currentUser]);

    const addAccount = async (account: Omit<Account, 'id'>) => {
        const newAccount: Account = { ...account, id: Date.now().toString() };
        const updatedAccounts = [...accounts, newAccount];
        setAccounts(updatedAccounts);
        await persistAccounts(updatedAccounts);
        setIsAddModalOpen(false);
    };

    const addMultipleAccounts = async (newAccounts: Omit<Account, 'id'>[]) => {
        const accountsWithIds = newAccounts.map((acc, index) => ({
            ...acc,
            id: `${Date.now()}-${index}`
        }));
        const updatedAccounts = [...accounts, ...accountsWithIds];
        setAccounts(updatedAccounts);
        await persistAccounts(updatedAccounts);
        setIsAddModalOpen(false);
    };

    const deleteAccount = async (id: string) => {
        const updatedAccounts = accounts.filter(acc => acc.id !== id);
        setAccounts(updatedAccounts);
        await persistAccounts(updatedAccounts);
    };

    const handleLogout = () => {
        setMasterKey(null);
        setAccounts([]);
        setCurrentUser(null);
        setError(null);
        setSearchTerm('');
    };

    if (!currentUser) {
        return <AuthScreen 
                    onLogin={handleLogin} 
                    onRegister={handleRegister}
                    error={error} 
                />;
    }

    const filteredAccounts = accounts.filter(account =>
        account.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6">
            <header className="w-full max-w-2xl flex justify-between items-center mb-6">
                 <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">
                        <span className="text-cyan-400">CodeFlow</span>
                        <span className="text-gray-300"> Authenticator</span>
                    </h1>
                    <p className="text-sm text-gray-400">Bem-vindo, {currentUser}</p>
                 </div>
                <button
                    onClick={handleLogout}
                    className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                    aria-label="Logout"
                >
                    <ArrowRightOnRectangleIcon className="w-6 h-6" />
                </button>
            </header>
            
            <main className="w-full max-w-2xl flex-grow">
                {accounts.length > 0 && (
                    <div className="mb-6 relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Pesquisar por emissor ou nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            aria-label="Search accounts"
                        />
                    </div>
                )}
                <AccountList accounts={filteredAccounts} onDelete={deleteAccount} />
            </main>
            
            <footer className="w-full text-center py-4 mt-6">
                <p className="text-sm text-cyan-400 font-medium">By Carlos Arthur Ferrão Júnior.</p>
            </footer>

            <button
                onClick={() => setIsAddModalOpen(true)}
                className="fixed bottom-6 right-6 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-4 shadow-lg transition-transform transform hover:scale-110"
                aria-label="Add new account"
            >
                <PlusIcon className="w-8 h-8" />
            </button>

            {isAddModalOpen && (
                <AddAccountModal
                    onClose={() => setIsAddModalOpen(false)}
                    onAddAccount={addAccount}
                    onAddMultipleAccounts={addMultipleAccounts}
                />
            )}
        </div>
    );
};

export default App;