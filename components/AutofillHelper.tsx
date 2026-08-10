
import React, { useState, useEffect, useRef } from 'react';
import { Account } from '../types';
import { generateTOTP } from '../services/totpService';
import { LockClosedIcon, CheckIcon } from './icons';

interface AutofillHelperProps {
  accounts: Account[];
}

const AutofillHelper: React.FC<AutofillHelperProps> = ({ accounts }) => {
  const [activeElement, setActiveElement] = useState<HTMLInputElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [justFilled, setJustFilled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'password' || target.type === 'number')) {
        const rect = target.getBoundingClientRect();
        setActiveElement(target);
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.right + window.scrollX - 30
        });
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && e.target !== activeElement) {
        setShowMenu(false);
        setActiveElement(null);
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeElement]);

  const fillCode = async (account: Account) => {
    if (!activeElement) return;
    
    try {
      const code = await generateTOTP(account.secret);
      activeElement.value = code;
      // Disparar eventos de input para garantir que o site detecte a mudança
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      activeElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      setJustFilled(true);
      setShowMenu(false);
      setTimeout(() => {
        setJustFilled(false);
        setActiveElement(null);
      }, 2000);
    } catch (error) {
      console.error("Autofill failed", error);
    }
  };

  if (!activeElement || accounts.length === 0) return null;

  return (
    <div 
      ref={menuRef}
      className="absolute z-[9999] flex items-center"
      style={{ top: position.top + 8, left: position.left }}
    >
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`p-1.5 rounded-md shadow-lg transition-all transform hover:scale-110 ${
          justFilled ? 'bg-green-500' : 'bg-cyan-600 hover:bg-cyan-500'
        } text-white`}
        title="CodeFlow Autofill"
      >
        {justFilled ? <CheckIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
      </button>

      {showMenu && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl overflow-hidden animate-code-refresh">
          <div className="p-2 border-b border-gray-700 bg-gray-900/50">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Selecionar Conta</p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => fillCode(acc)}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors flex flex-col border-b border-gray-700/50 last:border-0"
              >
                <span className="text-xs font-bold text-cyan-400 truncate">{acc.issuer}</span>
                <span className="text-[10px] text-gray-400 truncate">{acc.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutofillHelper;
