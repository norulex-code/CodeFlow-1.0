import { Account } from '../types';
import { encrypt, decrypt } from './cryptoService';

const getStorageKey = (email: string) => `totp-accounts-${email}`;
const getUserKey = (email: string) => `totp-user-${email}`;

interface UserData {
    salt: string; // hex
    email: string;
}

export const saveUser = (email: string, saltHex: string): void => {
    const userData: UserData = { salt: saltHex, email };
    localStorage.setItem(getUserKey(email), JSON.stringify(userData));
};

export const loadUser = (email: string): UserData | null => {
    const data = localStorage.getItem(getUserKey(email));
    if (!data) {
        return null;
    }
    try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed.email === 'string' && typeof parsed.salt === 'string') {
            return parsed as UserData;
        }
        console.warn(`Malformed user data found for ${email}, ignoring. Data:`, parsed);
        return null;
    } catch (e) {
        console.error(`Failed to parse user data for ${email}:`, e);
        return null;
    }
}

export const deleteUser = (email: string): void => {
    localStorage.removeItem(getStorageKey(email));
    localStorage.removeItem(getUserKey(email));
};

export const saveAccounts = async (accounts: Account[], key: CryptoKey, email: string): Promise<void> => {
    const data = JSON.stringify(accounts);
    const encryptedData = await encrypt(data, key);
    localStorage.setItem(getStorageKey(email), encryptedData);
};

export const loadAccounts = async (key: CryptoKey, email: string): Promise<Account[]> => {
    const encryptedData = localStorage.getItem(getStorageKey(email));
    if (!encryptedData) {
        return [];
    }
    const decryptedData = await decrypt(encryptedData, key);
    return JSON.parse(decryptedData);
};

export const userExists = (email: string): boolean => {
    return localStorage.getItem(getUserKey(email)) !== null;
};

export const getAdminUser = (): string => {
    return 'norulex@gmail.com';
}

export const getAllUsers = (): UserData[] => {
    const users: UserData[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('totp-user-')) {
            try {
                const item = localStorage.getItem(key);
                if (item) {
                    const parsed = JSON.parse(item);
                    // Adiciona validação para garantir que o objeto tem a estrutura esperada
                    if (parsed && typeof parsed.email === 'string' && typeof parsed.salt === 'string') {
                        users.push(parsed as UserData);
                    } else {
                        console.warn(`Dados de usuário inválidos encontrados para a chave ${key}:`, parsed);
                    }
                }
            } catch (e) {
                console.error(`Falha ao analisar os dados do usuário para a chave ${key}:`, e);
            }
        }
    }
    return users;
};

export const updateUserEmail = (oldEmail: string, newEmail: string): boolean => {
    if (userExists(newEmail)) {
        return false; // Novo email já existe
    }
    
    // Atualizar dados do usuário
    const userData = loadUser(oldEmail);
    if (userData) {
        userData.email = newEmail;
        localStorage.setItem(getUserKey(newEmail), JSON.stringify(userData));
        localStorage.removeItem(getUserKey(oldEmail));
    }

    // Renomear dados das contas
    const accountsData = localStorage.getItem(getStorageKey(oldEmail));
    if (accountsData) {
        localStorage.setItem(getStorageKey(newEmail), accountsData);
        localStorage.removeItem(getStorageKey(oldEmail));
    }
    
    return true;
};


export const clearAllData = (): void => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('totp-accounts-') || key.startsWith('totp-user-'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
};