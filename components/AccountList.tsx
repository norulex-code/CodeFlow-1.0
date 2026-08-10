import React from 'react';
import { Account } from '../types';
import AccountCard from './AccountCard';
import { PlusIcon, CameraIcon, InformationCircleIcon, DocumentArrowUpIcon } from './icons';

interface AccountListProps {
    accounts: Account[];
    onDelete: (id: string) => void;
    onEdit: (account: Account) => void;
    onOpenAddModal?: () => void;
}

const AccountList: React.FC<AccountListProps> = ({ accounts, onDelete, onEdit, onOpenAddModal }) => {
    if (accounts.length === 0) {
        return (
            <div className="space-y-6">
                {/* Main Manual Container */}
                <div className="bg-gray-800 border-2 border-cyan-500/40 rounded-xl p-6 sm:p-8 shadow-xl text-left relative overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 border-b border-gray-700 pb-4 mb-5">
                        <div className="p-2.5 bg-cyan-950 rounded-lg border border-cyan-700/60 text-cyan-400">
                            <InformationCircleIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-white">Manual de Instalação e Cadastro de Contas</h2>
                            <p className="text-xs sm:text-sm text-cyan-400 font-medium">Como adicionar sua primeira conta de autenticação (2FA)</p>
                        </div>
                    </div>

                    <p className="text-sm text-gray-300 mb-5 leading-relaxed">
                        Nenhuma conta encontrada. Siga o passo a passo abaixo para cadastrar suas contas do <strong>Google Authenticator</strong> ou de qualquer outro serviço (Google, Instagram, Gov.br, Facebook, etc.):
                    </p>

                    {/* Step-by-Step Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {/* Step 1 */}
                        <div className="bg-gray-900/80 border border-gray-700/80 rounded-lg p-4 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="bg-cyan-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">Passo 1</span>
                                    <CameraIcon className="w-5 h-5 text-cyan-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-white mb-1.5">Gerar ou Exportar QR Code</h3>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    <strong>Google Authenticator:</strong> Abra o app no celular &gt; <em>Menu &gt; Transferir contas &gt; Exportar contas</em> e tire um print do QR Code.
                                </p>
                                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                                    <strong>Outros sites:</strong> Acesse a área de <em>Segurança &gt; 2FA</em> do site desejado para gerar um novo QR Code.
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-gray-900/80 border border-gray-700/80 rounded-lg p-4 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="bg-cyan-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">Passo 2</span>
                                    <PlusIcon className="w-5 h-5 text-cyan-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-white mb-1.5">Clique no Botão '+'</h3>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    Clique no botão <strong>'+'</strong> localizado no botão azul flutuante no canto inferior direito da tela (ou use o botão abaixo).
                                </p>
                            </div>
                            <div className="mt-3 text-right">
                                <span className="inline-flex items-center text-xs text-cyan-400 font-semibold gap-1">
                                    Ver seta indicativa ↘
                                </span>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-gray-900/80 border border-gray-700/80 rounded-lg p-4 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="bg-cyan-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">Passo 3</span>
                                    <DocumentArrowUpIcon className="w-5 h-5 text-cyan-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-white mb-1.5">Escanear ou Enviar Print</h3>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    Na janela de cadastro, escolha <strong>Escanear com a Câmera</strong> ou envie o <strong>Print/Screenshot do QR Code</strong>.
                                </p>
                                <p className="text-xs text-green-400 font-medium mt-2">
                                    ✓ Suas contas serão importadas instantaneamente!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action button inside card */}
                    {onOpenAddModal && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-cyan-950/50 border border-cyan-800/80 rounded-lg p-4">
                            <div className="text-xs text-cyan-200">
                                Pronto para começar? Clique ao lado para abrir a tela de cadastro ou no botão '+' flutuante.
                            </div>
                            <button
                                type="button"
                                onClick={onOpenAddModal}
                                className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2.5 px-5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 text-sm flex-shrink-0"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Cadastrar Primeira Conta
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map(account => (
                <AccountCard key={account.id} account={account} onDelete={onDelete} onEdit={onEdit} />
            ))}
        </div>
    );
};

export default AccountList;
