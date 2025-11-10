
import React from 'react';
import { Account } from '../types';
import AccountCard from './AccountCard';

interface AccountListProps {
    accounts: Account[];
    onDelete: (id: string) => void;
}

const AccountList: React.FC<AccountListProps> = ({ accounts, onDelete }) => {
    if (accounts.length === 0) {
        return (
            <div className="text-center p-10 border-2 border-dashed border-gray-600 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-400">Nenhuma conta encontrada</h2>
                <p className="text-gray-500 mt-2">Clique no botão '+' para adicionar sua primeira conta 2FA.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map(account => (
                <AccountCard key={account.id} account={account} onDelete={onDelete} />
            ))}
        </div>
    );
};

export default AccountList;
