import React from 'react';
import { Account } from '../types';
import { XMarkIcon, TrashIcon, InformationCircleIcon } from './icons';

interface DeleteConfirmationModalProps {
    account: Account;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ account, onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-[60]">
            <div className="bg-gray-800 rounded-lg w-full max-w-md shadow-2xl text-white border border-gray-700">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                        <TrashIcon className="w-6 h-6" />
                        Excluir Conta
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <XMarkIcon className="w-6 h-6 text-gray-400" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-gray-200 mb-4">
                        Você tem certeza que deseja excluir a conta <span className="font-bold text-white">"{account.issuer} - {account.name}"</span>?
                    </p>
                    
                    <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-lg mb-6 flex gap-3">
                        <InformationCircleIcon className="w-6 h-6 text-red-400 shrink-0" />
                        <div className="text-sm text-red-200">
                            <p className="font-bold mb-1">Aviso Importante:</p>
                            <p>Ao excluir esta conta, você perderá o acesso aos códigos 2FA. Certifique-se de ter desativado a autenticação em duas etapas no serviço ou que possua códigos de backup.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <TrashIcon className="w-5 h-5" />
                            Excluir Definitivamente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;