
import React from 'react';
// Fixed: Removed 'LockOpenIcon' as it is not exported from './icons' and is not used in this component.
import { XMarkIcon, InformationCircleIcon, LockClosedIcon, ShieldCheckIcon, QuestionMarkCircleIcon } from './icons';

interface HelpModalProps {
    onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-[70]">
            <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] shadow-2xl text-white border border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                        <InformationCircleIcon className="w-6 h-6" />
                        Guia do Usuário e FAQ
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <XMarkIcon className="w-6 h-6 text-gray-400" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-8">
                    {/* Section: Como Começar */}
                    <section>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-100">
                            <ShieldCheckIcon className="w-5 h-5 text-cyan-400" />
                            Como Adicionar Contas
                        </h3>
                        <div className="space-y-3 text-sm text-gray-300">
                            <p>Existem três formas principais de adicionar suas contas 2FA:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2">
                                <li><span className="text-white font-medium">QR Code (Câmera ou Print):</span> Aponte a câmera para o QR Code ou envie um print/screenshot da imagem.</li>
                                <li><span className="text-white font-medium">Entrada Manual:</span> Digite o nome do serviço e a "Chave Secreta" (código em texto fornecido pelo site).</li>
                                <li><span className="text-white font-medium">Importação JSON:</span> Importe um arquivo JSON com várias contas pré-configuradas.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section: Google Authenticator Manual */}
                    <section className="bg-cyan-950/40 p-4 rounded-lg border border-cyan-800/60">
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-cyan-300">
                            <InformationCircleIcon className="w-5 h-5 text-cyan-400" />
                            Passo a Passo: Importar do Google Authenticator
                        </h3>
                        <div className="space-y-2 text-sm text-gray-300">
                            <p className="text-xs text-gray-300">
                                Você pode exportar todas as suas contas do <strong>Google Authenticator</strong> em lote:
                            </p>
                            <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-200 ml-1">
                                <li>No aplicativo Google Authenticator no celular, abra o menu (ou foto de perfil) e toque em <strong>"Transferir contas"</strong> &gt; <strong>"Exportar contas"</strong>.</li>
                                <li>Selecione as contas que deseja exportar e confirme com sua senha/biometria.</li>
                                <li>O aplicativo vai exibir um <strong>QR Code grande</strong> na tela.</li>
                                <li>No CodeFlow Authenticator, clique no botão <strong>"+"</strong> e:
                                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-300">
                                        <li>Use <strong>"Escanear com a Câmera"</strong> para ler o QR Code direto da tela do outro celular.</li>
                                        <li>Ou tire um print da tela do QR Code e clique em <strong>"Enviar Imagem / Screenshot do QR Code"</strong>.</li>
                                    </ul>
                                </li>
                                <li className="text-green-300 font-medium">Todas as contas serão cadastradas automaticamente!</li>
                            </ol>
                        </div>
                    </section>

                    {/* Section: Autofill Simulator */}
                    <section className="bg-cyan-900/20 p-4 rounded-lg border border-cyan-700/50">
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-cyan-400">
                            <LockClosedIcon className="w-5 h-5" />
                            Simulador de Preenchimento (Autofill)
                        </h3>
                        <div className="space-y-3 text-sm text-gray-300">
                            <p>O CodeFlow inclui um simulador de extensão para facilitar o preenchimento de códigos:</p>
                            <ul className="space-y-2 list-none ml-2">
                                <li className="flex gap-2">
                                    <span className="text-cyan-400">1.</span>
                                    <span>Clique em qualquer campo de texto (como o de busca) para ver o ícone flutuante aparecer.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-cyan-400">2.</span>
                                    <span>Clique no ícone de cadeado azul que aparecerá no canto do campo.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-cyan-400">3.</span>
                                    <span>Selecione a conta desejada e o código de 6 dígitos será inserido automaticamente.</span>
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Section: Segurança */}
                    <section className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-100">
                            <LockClosedIcon className="w-5 h-5 text-green-400" />
                            Segurança e Privacidade
                        </h3>
                        <div className="space-y-3 text-sm text-gray-300">
                            <p>Sua segurança é nossa prioridade absoluta:</p>
                            <ul className="space-y-2">
                                <li className="flex gap-2">
                                    <span className="text-cyan-400">●</span>
                                    <span>As chaves secretas são criptografadas usando <strong className="text-white">AES-GCM de 256 bits</strong> diretamente no seu navegador.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-cyan-400">●</span>
                                    <span>Ninguém, incluindo os desenvolvedores, tem acesso às suas chaves. Elas só podem ser descriptografadas com a sua <strong className="text-white">Senha Mestre</strong>.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-cyan-400">●</span>
                                    <span>Se você esquecer sua Senha Mestre, <strong className="text-red-400">os dados não poderão ser recuperados</strong>. Por segurança, o sistema apagará tudo para permitir um novo registro.</span>
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Section: FAQ */}
                    <section>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-100">
                            <QuestionMarkCircleIcon className="w-5 h-5 text-yellow-400" />
                            Dúvidas Frequentes
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-gray-100 text-sm mb-1">O código está dando "inválido" no site, o que fazer?</h4>
                                <p className="text-sm text-gray-400">Verifique se a hora e data do seu dispositivo estão corretas e em modo automático. O TOTP depende da sincronização precisa do tempo.</p>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-100 text-sm mb-1">Posso usar em vários dispositivos?</h4>
                                <p className="text-sm text-gray-400">Sim. Você pode exportar seus dados em um arquivo JSON criptografado e restaurá-lo em outro navegador ou dispositivo usando a mesma senha.</p>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-100 text-sm mb-1">Por que os códigos ficam vermelhos?</h4>
                                <p className="text-sm text-gray-400">Isso indica que o código expirará em menos de 5 segundos. Recomendamos esperar o próximo ciclo se estiver prestes a digitar.</p>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="p-4 border-t border-gray-700 text-center">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-8 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-colors"
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;