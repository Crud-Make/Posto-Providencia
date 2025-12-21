import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Lock, Mail } from 'lucide-react';

const LoginScreen: React.FC = () => {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: signInError } = await signIn(email, password);

        if (signInError) {
            setError(signInError.message || 'Falha ao fazer login');
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-end overflow-hidden"
            style={{
                backgroundImage: "url('/bg-login-final.png')",
                fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
        >
            {/* 
               Container do login flutuante (sem fundo) 
               Correspondente a .login-floating-container
            */}
            <main className="w-full max-w-[450px] p-[30px] mr-[8%] text-center text-white relative z-10 transition-all duration-500">

                {/* --- CORREÇÃO DO LOGO --- */}
                <header className="mb-8 flex flex-col items-center">
                    <div className="flex justify-center mb-[15px]">
                        <img
                            src="/logo-rede.png"
                            alt="Posto Providência"
                            className="logo-img max-w-[300px] h-auto mb-[10px]"
                            style={{
                                filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.5))'
                            }}
                        />
                    </div>
                    <p className="text-[1.1rem] mb-[35px] opacity-95 font-medium tracking-wide" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                        Sistema de Gestão Integrada
                    </p>
                </header>

                <form onSubmit={handleSubmit} className="flex flex-col">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/90 text-white rounded-lg font-bold text-sm shadow-lg backdrop-blur-sm">
                            {error}
                        </div>
                    )}

                    {/* Campo Email */}
                    <label className="block text-left text-[0.85rem] font-bold mb-[8px] tracking-[0.5px] uppercase" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
                        Email Corporativo
                    </label>
                    <div className="bg-white rounded-[8px] flex items-center px-[15px] py-[5px] mb-[20px]" style={{ boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
                        <Mail className="text-[#999] w-[20px] h-[20px] mr-[12px]" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex-grow bg-transparent border-none outline-none py-[12px] text-[1rem] text-[#333] placeholder-[#aaa]"
                            placeholder="usuario@postoprovidencia.com.br"
                            required
                        />
                    </div>

                    {/* Campo Senha */}
                    <label className="block text-left text-[0.85rem] font-bold mb-[8px] tracking-[0.5px] uppercase" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
                        Senha
                    </label>
                    <div className="bg-white rounded-[8px] flex items-center px-[15px] py-[5px] mb-[20px]" style={{ boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
                        <Lock className="text-[#999] w-[20px] h-[20px] mr-[12px]" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="flex-grow bg-transparent border-none outline-none py-[12px] text-[1rem] text-[#333] placeholder-[#aaa]"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <a href="#" className="block text-right text-white no-underline text-[0.9rem] mt-[-10px] mb-[30px] hover:underline" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
                        Esqueceu sua senha?
                    </a>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full p-[15px] bg-[#c62828] hover:bg-[#a82020] text-white text-[1.1rem] font-bold rounded-[8px] cursor-pointer flex justify-center items-center transition-colors duration-300 disabled:opacity-70"
                        style={{ boxShadow: '0 4px 20px rgba(198, 40, 40, 0.6)' }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={22} className="animate-spin mr-2" />
                                <span>Acessando...</span>
                            </>
                        ) : (
                            <>
                                <span>ACESSAR SISTEMA</span>
                                <svg className="ml-[10px] w-[20px] h-[20px] fill-current" viewBox="0 0 24 24">
                                    <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4z" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                <footer className="mt-[50px] text-[0.8rem] opacity-80 leading-relaxed" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                    <p>© 2025 Posto Providência. Todos os direitos reservados.</p>
                    <p>v2.5.8</p>
                </footer>
            </main>
        </div>
    );
};

export default LoginScreen;
