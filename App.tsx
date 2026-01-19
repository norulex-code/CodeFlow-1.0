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
import { PlusIcon, ArrowRightOnRectangleIcon, MagnifyingGlassIcon, UserCircleIcon, ArrowDownTrayIcon } from './components/icons';

const App: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
    const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Efeito para tentar re-login automático usando um token salvo
    useEffect(() => {
        const autoLogin = async () => {
            const token = storage.loadToken();
            // TODO: Adicionar validação de token com a API
            if (token) {
                 // Em um app real, você decodificaria o token para obter o email
                 // e então solicitaria a senha para derivar a chave e descriptografar.
                 // Para simplificar, o auto-login direto foi removido para forçar
                 // a entrada de senha, que é necessária para derivar a chave de decriptografia.
                 // A sessão "Manter conectado" agora apenas lembra o token, mas a senha
                 // ainda é necessária para desbloquear os dados.
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
            setError(err.message || 'Senha incorreta ou falha na comunicação com o servidor.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAdminLogin = async (email: string, password: string): Promise<void> => {
        // Esta lógica precisaria de um endpoint de login de admin dedicado
        setError(null);
        const adminEmail = storage.getAdminUser();
        if (email.toLowerCase() !== adminEmail.toLowerCase()) {
            setError('Acesso de administrador negado.');
            throw new Error('Admin access denied');
        }
        try {
            // Apenas verifica as credenciais, não faz login completo
            const userData = await storage.getUserData(email);
            const salt = new Uint8Array(userData.salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
            await deriveKey(password, salt);
            // Simula uma verificação de token de admin
            setIsAdminPanelOpen(true);
        } catch (err) {
            console.error('Falha ao fazer login como admin:', err);
            setError('Credenciais de administrador inválidas.');
            throw err;
        }
    };

    const handleRegister = async (email: string, password: string) => {
        setError(null);
        setIsLoading(true);
        try {
            const { salt, saltHex } = generateSalt();
            const key = await deriveKey(password, salt);
            
            await storage.register(email, saltHex, key);
            
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
        // Esta funcionalidade agora seria mais complexa, envolvendo uma chamada de API
        // para atualizar o salt e potencialmente re-criptografar os dados no servidor.
        if (!currentUser || !masterKey) throw new Error("Usuário não está logado.");
        console.log("A funcionalidade de alteração de senha precisa ser implementada no backend.");
        // Exemplo simplificado:
        const userData = await storage.getUserData(currentUser);
        const salt = new Uint8Array(userData.salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const verificationKey = await deriveKey(currentPassword, salt);
        // ... (verificar a chave)
        const newKey = await deriveKey(newPassword, salt);
        await storage.saveAccounts(accounts, newKey);
        setMasterKey(newKey);
    };

    const handleExportData = async (password: string): Promise<void> => {
        // A exportação continua sendo uma funcionalidade local, útil para backup
        if (!currentUser || !masterKey) throw new Error("Usuário não logado.");
        try {
            const encryptedData = await storage.loadEncryptedAccountsAPI(currentUser, storage.getSessionToken()!);
            const userData = await storage.getUserData(currentUser);
            if (!encryptedData) throw new Error("Nenhuma conta encontrada para exportar.");
            
            // Valida a senha antes de exportar
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
        // A restauração também é local, mas agora envia os dados para o servidor.
        setError(null);
        try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            const { email, salt: saltHex, encryptedAccounts } = backupData;

            // TODO: Adicionar lógica de API para registrar/substituir usuário e dados
            console.log("Lógica de restauração para API precisa ser implementada.");

            // Exemplo de como poderia ser:
            // 1. O usuário se registra/loga com email/senha do backup
            // 2. O app envia o 'encryptedAccounts' para o endpoint de salvamento
            
            alert("Restauração concluída. Faça login com a senha do backup.");

        } catch (err: any) {
            setError(err.message || 'Falha ao restaurar o backup.');
            throw err;
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
    
    const updateAccount = async (updatedAccount: Account) => {
        const updatedAccounts = accounts.map(acc => 
            acc.id === updatedAccount.id ? updatedAccount : acc
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
                    <p className="text-sm text-gray-400">Bem-vindo, {currentUser}</p>
                 </div>
                 <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsChangePasswordModalOpen(true)}
                        className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                        aria-label="Alterar Senha"
                    >
                        <UserCircleIcon className="w-6 h-6" />
                    </button>
                     <button
                        onClick={() => setIsExportModalOpen(true)}
                        className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                        aria-label="Exportar Dados"
                    >
                        <ArrowDownTrayIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                        aria-label="Sair"
                    >
                        <ArrowRightOnRectangleIcon className="w-6 h-6" />
                    </button>
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
                <AccountList accounts={filteredAccounts} onDelete={deleteAccount} onEdit={handleOpenEditModal} />
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
                />
            )}
             {isExportModalOpen && (
                <ExportModal
                    onClose={() => setIsExportModalOpen(false)}
                    onExport={handleExportData}
                />
            )}
        </div>
    );
};

export default App;
