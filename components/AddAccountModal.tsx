import React, { useState, useRef, useEffect } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import { ArrowUpTrayIcon, PencilIcon, XMarkIcon, InformationCircleIcon, DocumentArrowUpIcon, CameraIcon } from './icons';
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
    existingAccounts: Account[];
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

const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose, onAddAccount, onAddMultipleAccounts, existingAccounts }) => {
    const [activeTab, setActiveTab] = useState<Tab>('scan');
    const [showGoogleGuide, setShowGoogleGuide] = useState(false);
    const [issuer, setIssuer] = useState('');
    const [name, setName] = useState('');
    const [secret, setSecret] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [accountToVerify, setAccountToVerify] = useState<Omit<Account, 'id'> | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const qrReaderId = "qr-reader-hidden";
    const cameraViewportId = "qr-camera-viewport";

    const stopCamera = async () => {
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.error("Error stopping camera:", err);
            } finally {
                html5QrCodeRef.current = null;
            }
        }
        setIsCameraActive(false);
        setCameraLoading(false);
    };

    const startCamera = async () => {
        setError(null);
        setCameraLoading(true);
        setIsCameraActive(true);

        setTimeout(async () => {
            try {
                const QrClass = window.Html5Qrcode || Html5Qrcode;
                if (!QrClass) {
                    throw new Error("Biblioteca de QR code não encontrada.");
                }

                if (html5QrCodeRef.current) {
                    try {
                        if (html5QrCodeRef.current.isScanning) {
                            await html5QrCodeRef.current.stop();
                        }
                        html5QrCodeRef.current.clear();
                    } catch (_) {}
                }

                const scanner = new QrClass(cameraViewportId, { verbose: false });
                html5QrCodeRef.current = scanner;

                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: (viewfinderWidth, viewfinderHeight) => {
                            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                            const qrboxSize = Math.floor(minEdge * 0.7);
                            return { width: Math.max(180, qrboxSize), height: Math.max(180, qrboxSize) };
                        }
                    },
                    (decodedText) => {
                        stopCamera();
                        handleQrScan(decodedText);
                    },
                    () => {
                        // Scan iteration
                    }
                );
                setCameraLoading(false);
            } catch (err: any) {
                console.error("Camera access error:", err);
                setCameraLoading(false);
                setIsCameraActive(false);
                if (err?.name === 'NotAllowedError' || err?.toString().includes('Permission')) {
                    setError("Acesso à câmera negado. Por favor, permita o acesso no navegador ou envie uma imagem.");
                } else if (err?.name === 'NotFoundError' || err?.toString().includes('Requested device not found')) {
                    setError("Nenhuma câmera encontrada neste dispositivo. Você pode enviar uma imagem do QR code.");
                } else {
                    setError(`Erro ao iniciar câmera: ${err?.message || err}. Tente enviar uma imagem do QR code.`);
                }
            }
        }, 150);
    };

    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current) {
                if (html5QrCodeRef.current.isScanning) {
                    html5QrCodeRef.current.stop().catch(() => {}).then(() => {
                        html5QrCodeRef.current?.clear();
                        html5QrCodeRef.current = null;
                    });
                }
            }
        };
    }, []);

    const bytesToBase32 = (bytes: Uint8Array): string => {
        const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let bits = "";
        for (let i = 0; i < bytes.length; i++) {
            bits += bytes[i].toString(2).padStart(8, '0');
        }

        let base32 = "";
        for (let i = 0; i < bits.length; i += 5) {
            const chunk = bits.slice(i, i + 5);
            const paddedChunk = chunk.padEnd(5, '0');
            const value = parseInt(paddedChunk, 2);
            base32 += base32Chars[value];
        }
        
        const expectedLen = Math.ceil(bytes.length * 8 / 5);
        return base32.substring(0, expectedLen);
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

        const QrClass = window.Html5Qrcode || Html5Qrcode;
        if (!QrClass) {
            setError("Não foi possível carregar a biblioteca de leitura de QR code.");
            return;
        }
        if (!window.protobuf) {
            setError("Não foi possível carregar a biblioteca de importação.");
            return;
        }

        const html5QrCode = new QrClass(qrReaderId, { verbose: false });
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
        stopCamera();
        resetFormFields();
        setError(null);
        setSuccessMessage(null);
        setAccountToVerify(null);
        setVerificationCode('');
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleCloseModal = () => {
        stopCamera();
        onClose();
    };

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
                <input type="text" id="accountUsername" value={username} onChange={e => setUsername(e.target.value)} placeholder="Seu usuário para este serviço" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" autoComplete="username" />
            </div>
            <div>
                <label htmlFor="accountPassword" className="block text-sm font-medium text-gray-300 mb-1">Senha (Opcional)</label>
                <input type="password" id="accountPassword" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha para este serviço" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" autoComplete="current-password" />
            </div>
            <div className={`flex flex-col sm:flex-row gap-2 pt-2`}>
                <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                    Adicionar e Verificar
                </button>
            </div>
        </form>
    );

    const isDuplicate = (issuerVal: string, nameVal: string) => {
        const currentIssuer = issuerVal.trim() || nameVal.trim();
        return existingAccounts.some(acc => acc.issuer === currentIssuer && acc.name === nameVal.trim());
    };

    const renderVerificationScreen = () => {
        const duplicateWarning = isDuplicate(accountToVerify?.issuer || '', accountToVerify?.name || '');
        
        return (
            <div className="p-6">
                <h3 className="text-lg font-semibold text-center mb-2">Verificar Configuração</h3>
                <p className="text-sm text-gray-400 text-center mb-4">
                    Para finalizar, você pode ajustar os nomes e deve inserir o código de 6 dígitos gerado para a conta:
                </p>
                <div className="bg-gray-700/50 rounded-md p-4 mb-6 space-y-3">
                    <div>
                        <label htmlFor="verify-issuer" className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Emissor</label>
                        <input 
                            type="text" 
                            id="verify-issuer" 
                            value={accountToVerify?.issuer || ''} 
                            onChange={e => setAccountToVerify(prev => prev ? { ...prev, issuer: e.target.value } : null)}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="verify-name" className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Nome da Conta</label>
                        <input 
                            type="text" 
                            id="verify-name" 
                            value={accountToVerify?.name || ''} 
                            onChange={e => setAccountToVerify(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                    </div>
                    {duplicateWarning && (
                        <p className="text-xs text-yellow-400 flex items-center gap-1">
                            <InformationCircleIcon className="w-3 h-3" />
                            Uma conta com este emissor e nome já existe. Ela será renomeada automaticamente.
                        </p>
                    )}
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
    };
    
    const renderGoogleAuthGuide = () => (
        <div className="space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
                <div className="flex items-center gap-2">
                    <InformationCircleIcon className="w-6 h-6 text-cyan-400" />
                    <h3 className="font-bold text-lg text-white">Manual: Google Authenticator</h3>
                </div>
                <button
                    type="button"
                    onClick={() => setShowGoogleGuide(false)}
                    className="text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-2.5 py-1.5 rounded transition-colors font-medium"
                >
                    Voltar ao Cadastro
                </button>
            </div>

            <p className="text-xs text-gray-300">
                Siga este guia passo a passo para cadastrar ou transferir suas contas do <strong>Google Authenticator</strong> para o CodeFlow.
            </p>

            {/* Option 1: Export Multiple Accounts */}
            <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                    <span className="bg-cyan-600 text-white font-bold text-xs px-2 py-0.5 rounded">Método 1</span>
                    <h4 className="font-semibold text-sm text-cyan-300">Exportar Várias Contas do Google Authenticator</h4>
                </div>
                <ol className="list-decimal list-inside text-xs text-gray-200 space-y-2 pt-1">
                    <li>
                        No seu celular, abra o aplicativo <strong>Google Authenticator</strong>.
                    </li>
                    <li>
                        Toque no menu (três linhas no canto superior ou foto de perfil) e escolha <strong>"Transferir contas"</strong> (ou <em>"Exportar contas"</em>).
                    </li>
                    <li>
                        Selecione <strong>"Exportar contas"</strong>, confirme com sua digital/senha e escolha as contas que deseja transferir.
                    </li>
                    <li>
                        O Google Authenticator vai exibir um <strong>QR Code grande</strong> na tela do celular.
                    </li>
                    <li>
                        <strong>Para cadastrar aqui no CodeFlow:</strong>
                        <ul className="list-disc list-inside ml-4 mt-1.5 space-y-1 text-gray-300">
                            <li><strong className="text-cyan-300">Com 2 dispositivos:</strong> Clique no botão <span className="text-cyan-200 underline font-semibold">Escanear com a Câmera</span> neste app e aponte para a tela do celular.</li>
                            <li><strong className="text-cyan-300">No mesmo celular:</strong> Tire um print (screenshot) da tela do QR Code e envie pelo botão <span className="text-cyan-200 underline font-semibold">Enviar Imagem / Screenshot</span>.</li>
                        </ul>
                    </li>
                    <li className="text-green-300 font-medium pt-1">
                        ✓ Pronto! Todas as contas selecionadas serão importadas de uma só vez!
                    </li>
                </ol>
            </div>

            {/* Option 2: Single Account Setup */}
            <div className="bg-gray-700/50 border border-gray-600/70 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                    <span className="bg-gray-600 text-white font-bold text-xs px-2 py-0.5 rounded">Método 2</span>
                    <h4 className="font-semibold text-sm text-gray-200">Cadastrar Nova Conta de Qualquer Site</h4>
                </div>
                <ol className="list-decimal list-inside text-xs text-gray-300 space-y-1.5 pt-1">
                    <li>Acesse o site desejado (ex: Google, Facebook, Instagram, Gov.br, Mercado Livre) pelo computador ou celular.</li>
                    <li>Vá em <strong>Segurança &gt; Autenticação de Dois Fatores (2FA)</strong> e selecione <em>"App Autenticador"</em>.</li>
                    <li>O site exibirá um <strong>QR Code</strong> e/ou uma <strong>Chave Secreta</strong> (código em texto).</li>
                    <li>
                        No CodeFlow Authenticator:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                            <li>Escaneie o QR Code com a Câmera ou envie a foto do QR Code.</li>
                            <li>Ou copie a Chave Secreta e cole na aba <strong>"Manual"</strong> informando o nome do serviço.</li>
                        </ul>
                    </li>
                </ol>
            </div>

            <button
                type="button"
                onClick={() => setShowGoogleGuide(false)}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-4 rounded-md transition-colors text-sm shadow-md"
            >
                Entendi, voltar para o cadastro
            </button>
        </div>
    );

    const renderTutorialAndUpload = () => (
         <div className="space-y-4">
            <button
                type="button"
                onClick={() => setShowGoogleGuide(true)}
                className="w-full flex items-center justify-between bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 font-medium text-xs p-3 rounded-lg border border-cyan-700/60 transition-colors shadow-sm"
            >
                <div className="flex items-center gap-2">
                    <InformationCircleIcon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span>Como cadastrar via <strong>Google Authenticator</strong>?</span>
                </div>
                <span className="text-cyan-400 underline font-semibold">Ver Manual &rarr;</span>
            </button>

            {isCameraActive ? (
                <div className="space-y-3">
                    <div className="relative bg-gray-900 rounded-lg border border-cyan-500/50 shadow-inner min-h-[260px] flex items-center justify-center overflow-hidden">
                        <div id={cameraViewportId} className="w-full h-full min-h-[260px]"></div>
                        {cameraLoading && (
                            <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center gap-2 z-10">
                                <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs text-gray-300">Iniciando câmera...</span>
                            </div>
                        )}
                        {!cameraLoading && (
                            <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none z-10">
                                <span className="bg-gray-900/85 text-cyan-300 text-xs px-3 py-1.5 rounded-full border border-cyan-500/40 shadow-md">
                                    Aponte a câmera para o QR Code
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={stopCamera}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                        <XMarkIcon className="w-5 h-5 text-red-400" />
                        Parar Câmera
                    </button>
                </div>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={startCamera}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 px-4 rounded-md transition-all shadow-md flex items-center justify-center gap-2.5 text-base"
                    >
                        <CameraIcon className="w-6 h-6" />
                        Escanear com a Câmera
                    </button>

                    <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-gray-700"></div>
                        <span className="flex-shrink mx-3 text-xs text-gray-400 uppercase font-semibold">ou escolha uma opção</span>
                        <div className="flex-grow border-t border-gray-700"></div>
                    </div>

                    <div>
                        <input type="file" id="qr-file-input" className="hidden" onChange={handleQrFileChange} accept="image/*" ref={fileInputRef} />
                        <label htmlFor="qr-file-input" className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-3 px-4 rounded-md transition-colors cursor-pointer border border-gray-600">
                            <ArrowUpTrayIcon className="w-5 h-5 text-cyan-400" />
                            Enviar Imagem / Screenshot do QR Code
                        </label>
                    </div>

                    <div className="bg-gray-700/40 p-4 rounded-lg mt-2 border border-gray-700/60">
                        <div className="flex items-start">
                            <InformationCircleIcon className="w-5 h-5 text-cyan-400 flex-shrink-0 mr-2.5 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-gray-200 text-sm">Como adicionar suas contas:</h4>
                                <ol className="list-decimal list-inside mt-1.5 text-xs text-gray-300 space-y-1.5">
                                    <li>
                                        <strong className="text-cyan-300">Câmera ao vivo:</strong> Aponte sua câmera para o QR Code em outro dispositivo ou papel.
                                    </li>
                                    <li>
                                        <strong className="text-cyan-300">Imagem/Print:</strong> Se o QR Code estiver neste mesmo dispositivo, tire um print/screenshot e envie o arquivo.
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </>
            )}
            <div id={qrReaderId} style={{ display: 'none' }}></div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-md shadow-xl text-white max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold">{showGoogleGuide ? 'Manual Google Authenticator' : accountToVerify ? 'Verificar Conta' : 'Adicionar Nova Conta'}</h2>
                    <button onClick={handleCloseModal} className="p-1 rounded-full hover:bg-gray-700"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {showGoogleGuide ? (
                        renderGoogleAuthGuide()
                    ) : accountToVerify ? (
                        renderVerificationScreen()
                    ) : (
                        <>
                            <div className="flex border-b border-gray-700 -mx-6 -mt-6 mb-6">
                                <button onClick={() => { setActiveTab('scan'); resetScan(); }} className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'scan' ? 'bg-gray-700 text-cyan-400' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                                    <CameraIcon className="w-5 h-5" />
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddAccountModal;