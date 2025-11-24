import React, { useState } from 'react';
import '../styles/global.css';

const LoginView = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (password === 'yinghuijie') {
            // 密码正确，保存登录状态
            sessionStorage.setItem('isAuthenticated', 'true');
            onLogin();
        } else {
            // 密码错误，显示错误并抖动
            setError('密码错误，请重试');
            setIsShaking(true);
            setPassword('');
            
            setTimeout(() => {
                setIsShaking(false);
                setError('');
            }, 600);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="login-card-wrapper">
                    <div className={`login-card ${isShaking ? 'shake' : ''}`}>
                        <div className="login-header">
                            <div className="login-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <h1 className="login-title">沉浸式英语阅读器</h1>
                            <p className="login-subtitle">请输入访问密码</p>
                        </div>

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="login-input-group">
                                <div className="login-input-wrapper">
                                    <svg className="login-input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="输入密码"
                                        className="login-input"
                                        autoFocus
                                    />
                                </div>
                                {error && (
                                    <div className="login-error">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                            <path d="M12 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            <circle cx="12" cy="16" r="1" fill="currentColor"/>
                                        </svg>
                                        <span>{error}</span>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="login-button">
                                <span>进入</span>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </form>

                        <div className="login-footer">
                            <div className="login-footer-icon">🔒</div>
                            <span>安全访问保护</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .login-container {
                    width: 100vw;
                    height: 100vh;
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 9999;
                }

                .login-background {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    position: relative;
                    overflow: hidden;
                }

                .login-background::before {
                    content: '';
                    position: absolute;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
                    background-size: 50px 50px;
                    animation: backgroundMove 20s linear infinite;
                }

                @keyframes backgroundMove {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(50px, 50px); }
                }

                .login-card-wrapper {
                    position: relative;
                    z-index: 1;
                }

                .login-card {
                    background: var(--paper-color);
                    border-radius: var(--radius-lg);
                    padding: 48px 40px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    max-width: 420px;
                    width: 100%;
                    transition: transform 0.3s ease;
                }

                .login-card.shake {
                    animation: shake 0.6s ease;
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
                    20%, 40%, 60%, 80% { transform: translateX(10px); }
                }

                .login-header {
                    text-align: center;
                    margin-bottom: 36px;
                }

                .login-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
                    border-radius: 50%;
                    color: white;
                    margin-bottom: 24px;
                    box-shadow: var(--shadow-lg);
                }

                .login-title {
                    font-size: 28px;
                    font-weight: 700;
                    color: var(--ink-color);
                    margin: 0 0 8px 0;
                    letter-spacing: -0.5px;
                }

                .login-subtitle {
                    font-size: 15px;
                    color: var(--text-secondary);
                    margin: 0;
                }

                .login-form {
                    margin-bottom: 24px;
                }

                .login-input-group {
                    margin-bottom: 24px;
                }

                .login-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .login-input-icon {
                    position: absolute;
                    left: 16px;
                    color: var(--text-secondary);
                    pointer-events: none;
                }

                .login-input {
                    width: 100%;
                    padding: 14px 16px 14px 48px;
                    font-size: 16px;
                    border: 2px solid var(--border-color);
                    border-radius: var(--radius-md);
                    background: var(--bg-primary);
                    color: var(--ink-color);
                    transition: all 0.3s ease;
                    font-family: var(--font-sans);
                }

                .login-input:focus {
                    outline: none;
                    border-color: var(--primary-500);
                    background: white;
                    box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
                }

                .login-error {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 12px;
                    padding: 10px 12px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: var(--radius-sm);
                    color: #dc2626;
                    font-size: 14px;
                    animation: slideDown 0.3s ease;
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .login-error svg {
                    flex-shrink: 0;
                }

                .login-button {
                    width: 100%;
                    padding: 14px 24px;
                    font-size: 16px;
                    font-weight: 600;
                    color: white;
                    background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
                    border: none;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: var(--shadow-md);
                }

                .login-button:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }

                .login-button:active {
                    transform: translateY(0);
                }

                .login-footer {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    color: var(--text-secondary);
                    font-size: 13px;
                    padding-top: 24px;
                    border-top: 1px solid var(--border-color);
                }

                .login-footer-icon {
                    font-size: 16px;
                }

                @media (max-width: 480px) {
                    .login-card {
                        padding: 36px 24px;
                    }

                    .login-title {
                        font-size: 24px;
                    }

                    .login-icon {
                        width: 64px;
                        height: 64px;
                    }

                    .login-icon svg {
                        width: 32px;
                        height: 32px;
                    }
                }
            `}</style>
        </div>
    );
};

export default LoginView;
