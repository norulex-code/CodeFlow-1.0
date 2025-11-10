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
    return data ? JSON.parse(data) : null;
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

export const clearAllData = (): void => {
    // This is a dangerous operation and should be used with caution,
    // as it will remove all data for all users.
    // For now, we are not exposing it to the UI.
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('totp-accounts-') || key.startsWith('totp-user-'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
};