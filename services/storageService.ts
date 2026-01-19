// NOTA: Este arquivo foi modificado para simular um backend usando localStorage,
// pois a implementação da API não estava completa. A estrutura original com
// funções de API foi mantida, mas agora operam localmente.

import { Account } from '../types';
import { decrypt, encrypt } from './cryptoService';

// URL base da sua API de backend (mantida para referência)
const API_BASE_URL = 'https://sua-api-backend.com/api';

// --- LocalStorage "Backend" Implementation ---

const DB_KEY = 'totp-users';
const REMEMBER_EMAIL_KEY = 'totp-remembered-email';
const JWT_TOKEN_KEY = 'totp-session-token';

interface StoredUser {
    email: string;
    salt: string; // hex
    encryptedAccounts: string | null;
}

const loadDatabase = (): Record<string, StoredUser> => {
    try {
        const data = localStorage.getItem(DB_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
};

const saveDatabase = (db: Record<string, StoredUser>): void => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
};


// --- Funções de Autenticação e Usuário ---

interface UserData {
    salt: string; // hex
    email: string;
}

interface AuthResponse {
    token: string;
    user: {
        email: string;
        salt: string;
    };
}

// FIX: Replace mocked API fetch calls with localStorage implementation to make the app functional.
// Simula o registro de um novo usuário no "backend"
export const registerUserAPI = async (email: string, saltHex: string): Promise<UserData> => {
    const db = loadDatabase();
    const lowerEmail = email.toLowerCase();
    if (db[lowerEmail]) {
        throw new Error('Usuário já existe.');
    }
    const newUser: StoredUser = { email, salt: saltHex, encryptedAccounts: null };
    db[lowerEmail] = newUser;
    saveDatabase(db);
    return { email, salt: saltHex };
};

// FIX: Replace mocked API fetch calls with localStorage implementation to make the app functional.
// Simula o login do usuário e obtém um token JWT
export const loginUserAPI = async (email: string): Promise<AuthResponse> => {
    const db = loadDatabase();
    const user = db[email.toLowerCase()];
    if (!user) {
        throw new Error('Usuário não encontrado.');
    }
    // Fake a token
    const token = btoa(JSON.stringify({ email: user.email, iat: Date.now() }));
    return {
        token,
        user: { email: user.email, salt: user.salt },
    };
};


// --- Funções de Contas 2FA ---

// FIX: Replace mocked API fetch calls with localStorage implementation to make the app functional.
// Busca as contas criptografadas do "backend"
export const loadEncryptedAccountsAPI = async (email: string, token: string): Promise<string | null> => {
    // A validação do token poderia ser feita aqui em um app real
    const user = loadUser(email);
    return user?.encryptedAccounts || null;
};

// FIX: Replace mocked API fetch calls with localStorage implementation to make the app functional.
// Salva as contas criptografadas no "backend"
export const saveAccountsAPI = async (encryptedData: string, token: string): Promise<void> => {
    let email: string;
    try {
        const payload = JSON.parse(atob(token));
        email = payload.email;
        if (!email) throw new Error("Token sem email.");
    } catch {
        throw new Error("Token inválido ou expirado.");
    }
    
    const db = loadDatabase();
    const user = db[email.toLowerCase()];
    if (!user) {
        throw new Error("Usuário do token não encontrado.");
    }
    user.encryptedAccounts = encryptedData;
    saveDatabase(db);
};


// --- Lógica Combinada Usada pelo App ---

// Mantém a chave mestra em memória, não persiste mais
let sessionToken: string | null = null;

export const getSessionToken = () => sessionToken;
export const clearSessionToken = () => { sessionToken = null; };

// Função de login atualizada
export const login = async (email: string, key: CryptoKey): Promise<Account[]> => {
    const authResponse = await loginUserAPI(email);
    sessionToken = authResponse.token;
    
    const encryptedData = await loadEncryptedAccountsAPI(email, sessionToken);
    if (!encryptedData) {
        return [];
    }
    const decryptedData = await decrypt(encryptedData, key);
    return JSON.parse(decryptedData);
};

// Função de registro atualizada
export const register = async (email: string, saltHex: string, key: CryptoKey): Promise<void> => {
    await registerUserAPI(email, saltHex);
    // Após o registro, faz o login para obter o token
    const authResponse = await loginUserAPI(email);
    sessionToken = authResponse.token;
    // Salva uma lista vazia de contas para o novo usuário
    await saveAccounts([], key);
};

// FIX: Modify saveAccounts to handle admin password resets for other users.
// Função para salvar contas no backend
export const saveAccounts = async (accounts: Account[], key: CryptoKey, adminTargetEmail?: string): Promise<void> => {
    if (adminTargetEmail) {
        // Admin path for resetting another user's password
        const db = loadDatabase();
        const user = db[adminTargetEmail.toLowerCase()];
        if (!user) {
            throw new Error(`Ação de admin falhou: usuário ${adminTargetEmail} não encontrado.`);
        }
        const dataToEncrypt = JSON.stringify(accounts);
        user.encryptedAccounts = await encrypt(dataToEncrypt, key);
        saveDatabase(db);
        return;
    }

    // Normal user path
    if (!sessionToken) throw new Error("Não autenticado. Impossível salvar contas.");
    const data = JSON.stringify(accounts);
    const encryptedData = await encrypt(data, key);
    await saveAccountsAPI(encryptedData, sessionToken);
};


// --- Funções de administrador e outras (precisariam de endpoints de API) ---
// Estas funções foram implementadas para usar o localStorage como um backend simulado.

export const getAdminUser = (): string => {
    return 'norulex@gmail.com'; // Pode ser definido no backend
};

// Esta função agora buscaria os dados do usuário do localStorage
export const getUserData = async (email: string): Promise<UserData> => {
     const user = loadUser(email);
     if(!user) throw new Error("Usuário não encontrado para obter o salt.");
     return { email: user.email, salt: user.salt };
}

// FIX: Implement missing user management functions using localStorage to simulate a backend.
export const userExists = (email: string): boolean => {
    const db = loadDatabase();
    return !!db[email.toLowerCase()];
};

export const loadUser = (email: string): StoredUser | null => {
    const db = loadDatabase();
    return db[email.toLowerCase()] || null;
}

export const deleteUser = (email: string): void => {
    const db = loadDatabase();
    const lowerEmail = email.toLowerCase();
    delete db[lowerEmail];
    saveDatabase(db);
    if(loadRememberedEmail()?.toLowerCase() === lowerEmail) {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
};

export const getAllUsers = (): UserData[] => {
    const db = loadDatabase();
    return Object.values(db).map(u => ({ email: u.email, salt: u.salt }));
};

export const updateUserEmail = (oldEmail: string, newEmail: string): boolean => {
    const db = loadDatabase();
    const lowerOldEmail = oldEmail.toLowerCase();
    const lowerNewEmail = newEmail.toLowerCase();
    
    if (db[lowerNewEmail]) {
        return false; // new email already exists
    }
    
    const userData = db[lowerOldEmail];
    if (userData) {
        delete db[lowerOldEmail];
        userData.email = newEmail;
        db[lowerNewEmail] = userData;
        saveDatabase(db);
        if(loadRememberedEmail()?.toLowerCase() === lowerOldEmail) {
            saveRememberedEmail(newEmail);
        }
        return true;
    }
    return false;
};

// O restante das funções como deleteUser, updateUserEmail, etc., precisariam de
// seus próprios endpoints de API e lógica de `fetch`. Para este exemplo,
// focamos no fluxo principal de registro, login e salvamento de contas.
// As funcionalidades de "lembrar" agora seriam gerenciadas pelo token JWT.
// Por exemplo, salvar o token no localStorage para "Manter Conectado".
export const saveToken = (token: string) => localStorage.setItem(JWT_TOKEN_KEY, token);
export const loadToken = () => localStorage.getItem(JWT_TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(JWT_TOKEN_KEY);

// Funções para lembrar email
export const saveRememberedEmail = (email: string) => localStorage.setItem(REMEMBER_EMAIL_KEY, email);
export const loadRememberedEmail = (): string | null => localStorage.getItem(REMEMBER_EMAIL_KEY);
