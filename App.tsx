
import React, { useState, useEffect, useCallback } from 'react';
import { Account } from './types';
import * as storage from './services/storageService';
import { deriveKey, generateSalt, exportMasterKey, importMasterKey, decrypt } from './services/cryptoService';
import AccountList from './components/AccountList';
import AuthScreen from './components/AuthScreen';
import AddAccountModal from './components/AddAccountModal';
import AdminPanel from './components/AdminPanel';
import ChangePasswordModal from './components/ChangePasswordModal';
import EditAccountModal from './components/EditAccountModal';
import ExportModal from './components/ExportModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import Tooltip from './components/Tooltip';
import HelpModal from './components/HelpModal';
import AutofillHelper from './components/AutofillHelper';
import { PlusIcon, ArrowRightOnRectangleIcon, MagnifyingGlassIcon, UserCircleIcon, ArrowDownTrayIcon, InformationCircleIcon, SunIcon, MoonIcon } from './components/icons';

const App: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
    const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
    const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        const saved = localStorage.getItem('app_theme');
        return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        } else {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        }
        localStorage.setItem('app_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        const autoLogin = async () => {
            const token = storage.loadToken();
            if (token) {
                 // Sindicado para futura implementação de sessões reais
            }
            setIsLoading(false);
        };
        autoLogin();
    }, []);

    const handleLogin = async (email: string, password: string, options: { rememberEmail: boolean, keepLoggedIn: boolean }): Promise<void> => {
        setError(null);
        setIsLoading(true);
        try {
            const userData = await storage.getUserData(email);
            const salt = new Uint8Array(userData.salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
            
            const key = await deriveKey(password, salt);
            const decryptedAccounts = await storage.login(email, key);
            
            setMasterKey(key);
            setAccounts(decryptedAccounts);
            setCurrentUser(email);

            if (options.keepLoggedIn) {
                const token = storage.getSessionToken();
                if (token) storage.saveToken(token);
            } else {
                storage.clearToken();
            }

        } catch (err: any) {
            console.error('Falha no login:', err);
            const msg = (err?.message && !err.message.includes('operation-specific') && !err.message.includes('OperationError'))
                ? err.message
                : 'Senha incorreta. Verifique os dados digitados.';
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAdminLogin = async (email: string, password: string): Promise<void> => {
        setError(null);
        const adminEmail = storage.getAdminUser();
        if (email.toLowerCase() !== adminEmail.toLowerCase()) {
            const msg = `Acesso negado. Apenas a conta master (${adminEmail}) possui permissão de administrador.`;
            setError(msg);
            throw new Error(msg);
        }
        try {
            if (!storage.userExists(email)) {
                const msg = `A conta master (${adminEmail}) ainda não foi cadastrada. Crie a conta na aba Cadastrar com a senha desejada.`;
                setError(msg);
                throw new Error(msg);
            }
            const userData = await storage.getUserData(email);
            const salt = new Uint8Array(userData.salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
            const key = await deriveKey(password, salt);
            await storage.login(email, key);
            setIsAdminPanelOpen(true);
        } catch (err: any) {
            console.error('Falha ao fazer login como admin:', err);
            const msg = (err?.message && !err.message.includes('operation-specific') && !err.message.includes('OperationError'))
                ? err.message
                : 'Senha de administrador incorreta.';
            setError(msg);
            throw new Error(msg);
        }
    };

    const handleRegister = async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const { salt, saltHex } = generateSalt();
            const key = await deriveKey(password, salt);
            
            await storage.register(email, saltHex, key);
            
            localStorage.setItem('currentUser', email);
            setMasterKey(key);
            setAccounts([]);
            setCurrentUser(email);
        } catch (err: any) {
            console.error('Falha ao registrar:', err);
            setError(err.message || 'Não foi possível registrar o usuário.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleChangePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
        if (!currentUser || !masterKey) throw new Error("Usuário não está logado.");
        const userData = await storage.getUserData(currentUser);
        const salt = new Uint8Array(userData.salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const newKey = await deriveKey(newPassword, salt);
        await storage.saveAccounts(accounts, newKey);
        setMasterKey(newKey);
    };

    const handleExportData = async (password: string): Promise<void> => {
        if (!currentUser || !masterKey) throw new Error("Usuário não logado.");
        try {
            const encryptedData = await storage.loadEncryptedAccountsAPI(currentUser, storage.getSessionToken()!);
            const userData = await storage.getUserData(currentUser);
            if (!encryptedData) throw new Error("Nenhuma conta encontrada para exportar.");
            
            await decrypt(encryptedData, masterKey);

            const backupData = {
                email: currentUser,
                salt: userData.salt,
                encryptedAccounts: encryptedData
            };
    
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `codeflow-authenticator-backup-${currentUser}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            setIsExportModalOpen(false);
        } catch (error) {
            console.error("Falha na exportação:", error);
            throw new Error("A senha está incorreta ou os dados estão corrompidos.");
        }
    };

    const handleRestoreData = async (file: File, password: string): Promise<void> => {
        setError(null);
        setIsLoading(true);
        console.log('Iniciando restauração real de:', file.name);
        try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            
            if (!backupData.email || !backupData.salt || !backupData.encryptedAccounts) {
                throw new Error("Arquivo de backup inválido ou corrompido.");
            }

            console.log('Derivando chave do backup...');
            const salt = new Uint8Array(backupData.salt.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
            const key = await deriveKey(password, salt);
            
            console.log('Testando descriptografia do backup...');
            // Tenta descriptografar para validar a senha
            await decrypt(backupData.encryptedAccounts, key);
            
            console.log('Senha validada. Restaurando no storage...');
            await storage.restoreUserAPI(backupData.email, backupData.salt, backupData.encryptedAccounts);
            
            setNotification("Restauração concluída com sucesso! Agora você pode fazer login com sua senha.");
            console.log('Restauração concluída para:', backupData.email);
        } catch (err: any) {
            console.error('Erro na restauração:', err);
            setError(err.message || 'Falha ao restaurar o backup. Verifique a senha e o arquivo.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };


    const persistAccounts = useCallback(async (updatedAccounts: Account[]) => {
        if (!masterKey || !currentUser) return;
        try {
            await storage.saveAccounts(updatedAccounts, masterKey);
        } catch (err) {
            console.error('Falha ao salvar contas:', err);
            setError('Falha ao sincronizar contas com o servidor.');
        }
    }, [masterKey, currentUser]);

    const addAccount = async (account: Omit<Account, 'id'>) => {
        let finalName = account.name;
        let counter = 1;
        const currentIssuer = account.issuer || account.name;
        
        while (accounts.some(acc => acc.issuer === currentIssuer && acc.name === finalName)) {
            counter++;
            finalName = `${account.name} (${counter})`;
        }

        const newAccount: Account = { ...account, name: finalName, issuer: currentIssuer, id: Date.now().toString() };
        const updatedAccounts = [...accounts, newAccount];
        setAccounts(updatedAccounts);
        await persistAccounts(updatedAccounts);
        setIsAddModalOpen(false);
    };

    const addMultipleAccounts = async (newAccounts: Omit<Account, 'id'>[]) => {
        const updatedAccounts = [...accounts];
        
        for (const acc of newAccounts) {
            let finalName = acc.name;
            let counter = 1;
            const currentIssuer = acc.issuer || acc.name;
            
            while (updatedAccounts.some(existing => existing.issuer === currentIssuer && existing.name === finalName)) {
                counter++;
                finalName = `${acc.name} (${counter})`;
            }
            
            updatedAccounts.push({
                ...acc,
                name: finalName,
                issuer: currentIssuer,
                id: `${Date.now()}-${updatedAccounts.length}`
            });
        }

        setAccounts(updatedAccounts);
        await persistAccounts(updatedAccounts);
        setIsAddModalOpen(false);
    };

    const confirmDeleteAccount = (id: string) => {
        const account = accounts.find(acc => acc.id === id);
        if (account) {
            setAccountToDelete(account);
        }
    };

    const handleDeleteAccount = async () => {
        if (!accountToDelete) return;
        const updatedAccounts = accounts.filter(acc => acc.id !== accountToDelete.id);
        setAccounts(updatedAccounts);
        await persistAccounts(updatedAccounts);
        setAccountToDelete(null);
    };
    
    const updateAccount = async (updatedAccount: Account) => {
        let finalName = updatedAccount.name;
        let counter = 1;
        const currentIssuer = updatedAccount.issuer || updatedAccount.name;
        
        while (accounts.some(acc => acc.id !== updatedAccount.id && acc.issuer === currentIssuer && acc.name === finalName)) {
            counter++;
            finalName = `${updatedAccount.name} (${counter})`;
        }
        
        const accountWithUniqueName = { ...updatedAccount, name: finalName, issuer: currentIssuer };

        const updatedAccounts = accounts.map(acc => 
            acc.id === accountWithUniqueName.id ? accountWithUniqueName : acc
        );
        setAccounts(updatedAccounts);
        await persistAccounts(updatedAccounts);
        setIsEditModalOpen(false);
        setAccountToEdit(null);
    };

    const handleOpenEditModal = (account: Account) => {
        setAccountToEdit(account);
        setIsEditModalOpen(true);
    };

    const handleLogout = () => {
        setMasterKey(null);
        setAccounts([]);
        setCurrentUser(null);
        setError(null);
        setSearchTerm('');
        storage.clearSessionToken();
        storage.clearToken();
    };

    if (isLoading && !currentUser) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <p className="text-white text-lg">Carregando...</p>
            </div>
        );
    }


    if (!currentUser) {
        return (
            <>
                <AuthScreen 
                    onLogin={handleLogin} 
                    onRegister={handleRegister}
                    onAdminLogin={handleAdminLogin}
                    onRestore={handleRestoreData}
                    error={error} 
                    theme={theme}
                    onToggleTheme={toggleTheme}
                />
                {isAdminPanelOpen && (
                    <AdminPanel
                        currentUserEmail={storage.getAdminUser()}
                        onClose={() => {
                            setIsAdminPanelOpen(false);
                            setError(null);
                        }}
                    />
                )}
            </>
        );
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
                    <p className="text-xs font-medium text-cyan-400">By Carlos Arthur Ferrão Júnior.</p>
                    <p className="text-xs text-gray-400 mt-0.5">Bem-vindo, {currentUser}</p>
                 </div>
                 <div className="flex items-center space-x-1 sm:space-x-2">
                    <Tooltip text={theme === 'dark' ? "Ativar Modo Dia (Alto Contraste)" : "Ativar Modo Noite"}>
                        <button
                            onClick={toggleTheme}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors text-xs font-semibold"
                            aria-label={theme === 'dark' ? "Ativar Modo Dia" : "Ativar Modo Noite"}
                        >
                            {theme === 'dark' ? (
                                <>
                                    <SunIcon className="w-4 h-4 text-amber-400" />
                                    <span className="hidden sm:inline text-gray-200">Contraste Dia</span>
                                </>
                            ) : (
                                <>
                                    <MoonIcon className="w-4 h-4 text-cyan-500" />
                                    <span className="hidden sm:inline text-gray-800">Contraste Noite</span>
                                </>
                            )}
                        </button>
                    </Tooltip>
                    <Tooltip text="Ajuda e FAQ">
                        <button
                            onClick={() => setIsHelpModalOpen(true)}
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors text-cyan-400"
                            aria-label="Ajuda e FAQ"
                        >
                            <InformationCircleIcon className="w-6 h-6" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Alterar Senha">
                        <button
                            onClick={() => setIsChangePasswordModalOpen(true)}
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                            aria-label="Alterar Senha"
                        >
                            <UserCircleIcon className="w-6 h-6" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Exportar Dados">
                        <button
                            onClick={() => setIsExportModalOpen(true)}
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                            aria-label="Exportar Dados"
                        >
                            <ArrowDownTrayIcon className="w-6 h-6" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Sair">
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                            aria-label="Sair"
                        >
                            <ArrowRightOnRectangleIcon className="w-6 h-6" />
                        </button>
                    </Tooltip>
                 </div>
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
                <AccountList 
                    accounts={filteredAccounts} 
                    onDelete={confirmDeleteAccount} 
                    onEdit={handleOpenEditModal} 
                    onOpenAddModal={() => setIsAddModalOpen(true)} 
                />
            </main>
            
            <footer className="w-full text-center py-4 mt-6">
                <p className="text-sm text-cyan-400 font-medium">By Carlos Arthur Ferrão Júnior.</p>
            </footer>

            <div className="fixed bottom-6 right-6 z-40">
                <Tooltip text="Adicionar Conta" position="left">
                    <div className="relative inline-block">
                        {accounts.length === 0 && (
                            <span className="absolute -inset-1 rounded-full bg-cyan-400 opacity-75 animate-ping pointer-events-none"></span>
                        )}
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className={`relative bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-4 shadow-xl transition-transform transform hover:scale-110 flex items-center justify-center ${accounts.length === 0 ? 'animate-pulse ring-4 ring-cyan-300 ring-offset-2 ring-offset-gray-900' : ''}`}
                            aria-label="Add new account"
                        >
                            <PlusIcon className="w-8 h-8" />
                        </button>
                    </div>
                </Tooltip>
            </div>

            {isAddModalOpen && (
                <AddAccountModal
                    onClose={() => setIsAddModalOpen(false)}
                    onAddAccount={addAccount}
                    onAddMultipleAccounts={addMultipleAccounts}
                    existingAccounts={accounts}
                />
            )}
            {isChangePasswordModalOpen && (
                <ChangePasswordModal
                    onClose={() => setIsChangePasswordModalOpen(false)}
                    onChangePassword={handleChangePassword}
                />
            )}
            {isEditModalOpen && accountToEdit && (
                <EditAccountModal
                    account={accountToEdit}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setAccountToEdit(null);
                    }}
                    onSave={updateAccount}
                    existingAccounts={accounts}
                />
            )}
             {isExportModalOpen && (
                <ExportModal
                    onClose={() => setIsExportModalOpen(false)}
                    onExport={handleExportData}
                />
            )}
            {accountToDelete && (
                <DeleteConfirmationModal
                    account={accountToDelete}
                    onClose={() => setAccountToDelete(null)}
                    onConfirm={handleDeleteAccount}
                />
            )}
            {isHelpModalOpen && (
                <HelpModal onClose={() => setIsHelpModalOpen(false)} />
            )}
            
            {/* Autofill Extension Simulator */}
            <AutofillHelper accounts={accounts} />
        </div>
    );
};

export default App;
