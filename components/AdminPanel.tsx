import React, { useState, useEffect, useCallback } from 'react';
import { getAllUsers, deleteUser } from '../services/storageService';
import { XMarkIcon, UserMinusIcon, PencilSquareIcon, EnvelopeIcon } from './icons';
import EditUserModal from './EditUserModal';

interface UserData {
    salt: string;
    email: string;
}

interface AdminPanelProps {
    currentUserEmail: string;
    onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUserEmail, onClose }) => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchUsers = useCallback(() => {
        const allUsers = getAllUsers();
        setUsers(allUsers.filter(u => u.email !== currentUserEmail));
    }, [currentUserEmail]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleDeleteUser = (email: string) => {
        if (window.confirm(`Tem certeza que deseja excluir o usuário ${email}? Todos os seus dados serão apagados permanentemente.`)) {
            deleteUser(email);
            fetchUsers(); // Refresh a lista de usuários
        }
    };

    const handleEditUser = (user: UserData) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedUser(null);
        fetchUsers(); // Refresh para caso o email tenha sido alterado
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 rounded-lg w-full max-w-lg shadow-xl text-white flex flex-col" style={{maxHeight: '90vh'}}>
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold">Painel de Administrador</h2>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><XMarkIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        {users.length > 0 ? (
                            <ul className="space-y-3">
                                {users.map(user => (
                                    <li key={user.email} className="bg-gray-700/50 p-3 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center">
                                            <EnvelopeIcon className="w-5 h-5 mr-3 text-gray-400"/>
                                            <span className="text-gray-200">{user.email}</span>
                                        </div>
                                        <div className="space-x-2">
                                            <button onClick={() => handleEditUser(user)} className="p-2 rounded-full hover:bg-gray-600 transition-colors" aria-label={`Editar ${user.email}`}>
                                                <PencilSquareIcon className="w-5 h-5 text-cyan-400" />
                                            </button>
                                            <button onClick={() => handleDeleteUser(user.email)} className="p-2 rounded-full hover:bg-red-800/50 transition-colors" aria-label={`Excluir ${user.email}`}>
                                                <UserMinusIcon className="w-5 h-5 text-red-400" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-400">Nenhum outro usuário registrado.</p>
                        )}
                    </div>
                </div>
            </div>
            {isEditModalOpen && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    onClose={handleCloseEditModal}
                />
            )}
        </>
    );
};

export default AdminPanel;