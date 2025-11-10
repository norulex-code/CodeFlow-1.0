import React, { useState, useRef } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import { ArrowUpTrayIcon, PencilIcon, XMarkIcon, InformationCircleIcon, DocumentArrowUpIcon } from './icons';
import { generateHOTP, generateTOTP } from '../services/totpService';
import { Account } from '../types';

declare global {
    interface Window {
        Html5Qrcode: typeof Html5Qrcode;
        protobuf: any; 
    }
}

interface AddAccountModalProps {
    onClose: () => void;
    onAddAccount: (account: Omit<Account, 'id'>) => void;
    onAddMultipleAccounts: (accounts: Omit<Account, 'id'>[]) => void;
}

type Tab = 'scan' | 'manual' | 'import';

// Protobuf schema definition for Google Authenticator migration payload
const protoDefinition = {
    nested: {
        MigrationPayload: {
            fields: {
                otpParameters: { rule: 'repeated', type: 'OtpParameters', id: 1 },
                version: { type: 'int32', id: 2 },
                batchSize: { type: 'int32', id: 3 },
                batchIndex: { type: 'int32', id: 4 },
                batchId: { type: 'int32', id: 5 },
            },
        },
        OtpParameters: {
            fields: {
                secret: { type: 'bytes', id: 1 },
                name: { type: 'string', id: 2 },
                issuer: { type: 'string', id: 3 },
                algorithm: { type: 'int32', id: 4 },
                digits: { type: 'int32', id: 5 },
                type: { type: 'int32', id: 6 },
                counter: { type: 'int64', id: 7 },
            },
        },
    },
};

const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose, onAddAccount, onAddMultipleAccounts }) => {
    const [activeTab, setActiveTab] = useState<Tab>('scan');
    const [issuer, setIssuer] = useState('');
    const [name, setName] = useState('');
    const [secret, setSecret] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [accountToVerify, setAccountToVerify] = useState<Omit<Account, 'id'> | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const qrReaderId = "qr-reader-hidden";

    const bytesToBase32 = (bytes: Uint8Array): string => {
        const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let bits = "";
        let base32 = "";

        for (let i = 0; i < bytes.length; i++) {
            bits += bytes[i].toString(2).padStart(8, '0');
        }

        for (let i = 0; i < bits.length; i += 5) {
            const chunk = bits.slice(i, i + 5);
            if (chunk.length === 5) {
                const value = parseInt(chunk, 2);
                base32 += base32Chars[value];
            }
        }
        return base32;
    };

    const handleQrScan = (data: string) => {
        try {
            const trimmedData = data.trim();
    
            if (trimmedData.startsWith('otpauth-migration://')) {
                const url = new URL(trimmedData);
                const dataParam = url.searchParams.get('data');
                if (!dataParam) {
                    throw new Error('Dados de migração não encontrados no QR code.');
                }
                
                const decodedData = atob(dataParam);
                const bytes = new Uint8Array(decodedData.length);
                for (let i = 0; i < decodedData.length; i++) {
                    bytes[i] = decodedData.charCodeAt(i);
                }

                const root = window.protobuf.Root.fromJSON(protoDefinition);
                const MigrationPayload = root.lookupType('MigrationPayload');
                const payload = MigrationPayload.decode(bytes);
                const payloadObject = MigrationPayload.toObject(payload, {
                    longs: String,
                    enums: String,
                    bytes: Array,
                });
                
                if (!payloadObject.otpParameters || payloadObject.otpParameters.length === 0) {
                    throw new Error('Nenhuma conta encontrada no QR code de migração.');
                }

                const newAccounts = payloadObject.otpParameters.map((param: any) => ({
                    secret: bytesToBase32(new Uint8Array(param.secret)),
                    name: param.name || '',
                    issuer: param.issuer || param.name || ''
                }));
                
                onAddMultipleAccounts(newAccounts);
                setSuccessMessage(`${newAccounts.length} conta(s) importada(s) com sucesso!`);
                setTimeout(() => onClose(), 2000); // Close modal after 2 seconds

            } else if (trimmedData.startsWith('otpauth://totp/')) {
                 const uriWithoutProtocol = trimmedData.substring('otpauth://totp/'.length);
                 const queryIndex = uriWithoutProtocol.indexOf('?');
                 
                 if (queryIndex === -1) {
                      throw new Error('QR code inválido: faltam parâmetros essenciais (como a chave secreta).');
                 }
     
                 const labelPart = uriWithoutProtocol.substring(0, queryIndex);
                 const queryPart = uriWithoutProtocol.substring(queryIndex + 1);
     
                 const params = new URLSearchParams(queryPart);
                 const secretVal = params.get('secret');
                 if (!secretVal) {
                     throw new Error('Segredo não encontrado no QR code.');
                 }
     
                 const decodedLabel = decodeURIComponent(labelPart);
                 
                 let parsedIssuer = '';
                 let parsedName = '';
     
                 if (decodedLabel.includes(':')) {
                     const labelParts = decodedLabel.split(':');
                     parsedIssuer = labelParts[0].trim();
                     parsedName = labelParts.slice(1).join(':').trim();
                 } else {
                     parsedName = decodedLabel.trim();
                 }
     
                 const issuerFromParams = params.get('issuer');
                 if (issuerFromParams) {
                     parsedIssuer = issuerFromParams.trim();
                 }
     
                 if (!parsedIssuer && parsedName) {
                     parsedIssuer = parsedName;
                 }
                 
                 setAccountToVerify({
                    issuer: parsedIssuer,
                    name: parsedName,
                    secret: secretVal.replace(/\s/g, ''),
                 });
                 setError(null);
            } else {
                throw new Error('QR code inválido. O formato esperado é "otpauth://totp/..." para uma conta ou "otpauth-migration://..." para múltiplas contas.');
            }
    
        } catch (e: any) {
            setError(e.message || "Ocorreu um erro desconhecido ao ler o QR code.");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    
    const handleQrFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }
        const file = event.target.files[0];
        
        resetScan();

        if (!window.Html5Qrcode) {
            setError("Não foi possível carregar a biblioteca de leitura de QR code.");
            return;
        }
        if (!window.protobuf) {
            setError("Não foi possível carregar a biblioteca de importação.");
            return;
        }

        const html5QrCode = new window.Html5Qrcode(qrReaderId, { verbose: false });
        html5QrCode.scanFile(file, false)
            .then(decodedText => {
                handleQrScan(decodedText);
            })
            .catch(err => {
                console.error("QR Scan Error:", err);
                setError(`Não foi possível ler o QR code da imagem. Verifique se a imagem é nítida e o QR code está completo.`);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            });
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("Falha ao ler o conteúdo do arquivo.");
                }
                const data = JSON.parse(text);

                if (!Array.isArray(data)) {
                    throw new Error("O arquivo JSON deve conter um array (lista) de contas.");
                }

                const newAccounts = data.map((item: any, index: number) => {
                    if (typeof item !== 'object' || item === null || !item.secret || !item.name) {
                        throw new Error(`Entrada inválida no índice ${index}. As propriedades 'name' e 'secret' são obrigatórias.`);
                    }
                    return {
                        issuer: item.issuer || item.name,
                        name: item.name,
                        secret: item.secret,
                        username: item.username,
                        password: item.password,
                    };
                });
                
                if (newAccounts.length === 0) {
                     throw new Error("Nenhuma conta válida encontrada no arquivo.");
                }

                onAddMultipleAccounts(newAccounts);
                setSuccessMessage(`${newAccounts.length} conta(s) importada(s) com sucesso do arquivo!`);
                setTimeout(() => onClose(), 2000);

            } catch (err: any) {
                setError(err.message || "Ocorreu um erro ao processar o arquivo.");
            } finally {
                 if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };

        reader.onerror = () => {
            setError("Não foi possível ler o arquivo selecionado.");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        };

        reader.readAsText(file);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !secret.trim()) {
            setError("Nome da conta e segredo são obrigatórios.");
            return;
        }
        setAccountToVerify({ 
            issuer: issuer.trim() || name.trim(), 
            name: name.trim(), 
            secret: secret.trim().replace(/\s/g, ''),
            username: username.trim(),
            password: password
        });
        resetFormFields();
    };
    
    const handleVerificationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountToVerify) return;
    
        setError(null);
        try {
            const period = 30;
            const counter = Math.floor(Date.now() / 1000 / period);
            
            const validCodes = await Promise.all([
                generateHOTP(accountToVerify.secret, counter - 1),
                generateHOTP(accountToVerify.secret, counter),
                generateHOTP(accountToVerify.secret, counter + 1),
            ]);
    
            if (validCodes.includes(verificationCode)) {
                onAddAccount(accountToVerify);
                setSuccessMessage('Conta adicionada com sucesso!');
                setTimeout(() => onClose(), 1500);
            } else {
                setError('Código de verificação incorreto. Tente novamente.');
                setVerificationCode('');
            }
        } catch (err) {
            console.error("Verification failed:", err);
            setError("Falha ao verificar o código. Verifique se a chave secreta está correta.");
        }
    };
    
    const resetFormFields = () => {
        setIssuer('');
        setName('');
        setSecret('');
        setUsername('');
        setPassword('');
    }

    const resetScan = () => {
        resetFormFields();
        setError(null);
        setSuccessMessage(null);
        setAccountToVerify(null);
        setVerificationCode('');
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const renderForm = () => (
         <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
                <label htmlFor="issuer" className="block text-sm font-medium text-gray-300 mb-1">Emissor (Opcional)</label>
                <input type="text" id="issuer" value={issuer} onChange={e => setIssuer(e.target.value)} placeholder="Ex: Google" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
             <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Nome da Conta</label>
                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: email@example.com" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
            </div>
            <div>
                <label htmlFor="secret" className="block text-sm font-medium text-gray-300 mb-1">Sua Chave Secreta (2FA)</label>
                <input type="text" id="secret" value={secret} onChange={e => setSecret(e.target.value)} placeholder="Cole sua chave aqui" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
            </div>
            <div>
                <label htmlFor="accountUsername" className="block text-sm font-medium text-gray-300 mb-1">Nome de Usuário (Opcional)</label>
                <input type="text" id="accountUsername" value={username} onChange={e => setUsername(e.target.value)} placeholder="Seu usuário para este serviço" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
                <label htmlFor="accountPassword" className="block text-sm font-medium text-gray-300 mb-1">Senha (Opcional)</label>
                <input type="password" id="accountPassword" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha para este serviço" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div className={`flex flex-col sm:flex-row gap-2 pt-2`}>
                <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                    Adicionar e Verificar
                </button>
            </div>
        </form>
    );

    const renderVerificationScreen = () => (
        <div className="p-6">
            <h3 className="text-lg font-semibold text-center mb-2">Verificar Configuração</h3>
            <p className="text-sm text-gray-400 text-center mb-4">
                Para finalizar, insira o código de 6 dígitos gerado para a conta:
            </p>
            <div className="bg-gray-700/50 rounded-md p-3 text-center mb-6">
                <p className="text-sm text-gray-300">{accountToVerify?.issuer}</p>
                <p className="font-semibold text-white">{accountToVerify?.name}</p>
            </div>
    
            <form onSubmit={handleVerificationSubmit}>
                <label htmlFor="verification-code" className="sr-only">Código de Verificação</label>
                <input
                    id="verification-code"
                    name="verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center bg-gray-700 border border-gray-600 rounded-md px-3 py-3 font-mono text-3xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    required
                    autoFocus
                />
                <div className="flex gap-2 pt-6">
                     <button type="button" onClick={resetScan} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Voltar
                    </button>
                    <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Verificar e Salvar
                    </button>
                </div>
            </form>
        </div>
    );
    
    const renderTutorialAndUpload = () => (
         <>
            <div className="bg-gray-700/50 p-4 rounded-lg mb-6">
                <div className="flex items-start">
                    <InformationCircleIcon className="w-6 h-6 text-cyan-400 flex-shrink-0 mr-3 mt-1" />
                    <div>
                        <h4 className="font-bold text-gray-100">Como adicionar suas contas:</h4>
                        <ol className="list-decimal list-inside mt-2 text-sm text-gray-300 space-y-2">
                             <li>
                                <strong className="text-cyan-300">Opção 1 (Várias Contas):</strong> Em seu app autenticador (ex: Google Authenticator), use a função "Exportar" ou "Transferir contas". Tire um <strong>print (screenshot)</strong> do QR Code de transferência.
                            </li>
                             <li>
                                <strong className="text-cyan-300">Opção 2 (Conta Única):</strong> No <strong>site</strong> do serviço (ex: DJPJ, Facebook), ao configurar o 2FA, tire um <strong>print (screenshot)</strong> do QR Code exibido na tela.
                            </li>
                            <li>Salve a imagem em seu computador ou celular.</li>
                            <li>Clique no botão abaixo e selecione a imagem que você salvou.</li>
                        </ol>
                    </div>
                </div>
            </div>
            <div>
                <input type="file" id="qr-file-input" className="hidden" onChange={handleQrFileChange} accept="image/*" ref={fileInputRef} />
                <label htmlFor="qr-file-input" className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md transition-colors cursor-pointer">
                    <ArrowUpTrayIcon className="w-5 h-5" />
                    Enviar Imagem do QR Code
                </label>
            </div>
            <div id={qrReaderId} style={{ display: 'none' }}></div>
        </>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-md shadow-xl text-white">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">{accountToVerify ? 'Verificar Conta' : 'Adicionar Nova Conta'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                {accountToVerify ? (
                    renderVerificationScreen()
                ) : (
                    <>
                        <div className="flex border-b border-gray-700">
                            <button onClick={() => { setActiveTab('scan'); resetScan(); }} className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'scan' ? 'bg-gray-700 text-cyan-400' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                                <ArrowUpTrayIcon className="w-5 h-5" />
                                QR Code
                            </button>
                            <button onClick={() => { setActiveTab('manual'); resetScan(); }} className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'bg-gray-700 text-cyan-400' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                               <PencilIcon className="w-5 h-5" />
                               Manual
                            </button>
                             <button onClick={() => { setActiveTab('import'); resetScan(); }} className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'import' ? 'bg-gray-700 text-cyan-400' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                               <DocumentArrowUpIcon className="w-5 h-5" />
                               Importar
                            </button>
                        </div>

                        <div className="p-6">
                            {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
                            {successMessage && <p className="bg-green-900/50 text-green-300 p-3 rounded-md mb-4 text-sm">{successMessage}</p>}
                            
                            {activeTab === 'scan' && (
                                <div>
                                    {!successMessage && renderTutorialAndUpload()}
                                </div>
                            )}

                            {activeTab === 'manual' && (
                               renderForm()
                            )}

                            {activeTab === 'import' && !successMessage && (
                                <>
                                    <div className="bg-gray-700/50 p-4 rounded-lg mb-6">
                                        <div className="flex items-start">
                                            <InformationCircleIcon className="w-6 h-6 text-cyan-400 flex-shrink-0 mr-3 mt-1" />
                                            <div>
                                                <h4 className="font-bold text-gray-100">Como importar de um arquivo:</h4>
                                                <p className="mt-2 text-sm text-gray-300">
                                                    Crie um arquivo JSON com uma lista de suas contas. O nome de usuário e a senha são opcionais.
                                                </p>
                                                <p className="mt-2 text-sm text-gray-300">
                                                    <strong>Formato esperado:</strong>
                                                </p>
                                                <pre className="bg-gray-900 text-cyan-300 p-3 mt-2 rounded-md text-xs overflow-x-auto">
                                                    <code>
        {`[
          {
            "issuer": "Google",
            "name": "exemplo@gmail.com",
            "secret": "SEGREDOAQUI123",
            "username": "opcional",
            "password": "opcional"
          },
          {
            "issuer": "GitHub",
            "name": "usuario",
            "secret": "OUTROSEGREDOAQUI"
          }
        ]`}
                                                    </code>
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <input type="file" id="import-file-input" className="hidden" onChange={handleFileImport} accept=".json" ref={fileInputRef} />
                                        <label htmlFor="import-file-input" className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md transition-colors cursor-pointer">
                                            <DocumentArrowUpIcon className="w-5 h-5" />
                                            Selecionar Arquivo JSON
                                        </label>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AddAccountModal;