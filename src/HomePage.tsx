'use client';

import React, { useEffect, useState } from 'react';
import FormularioAgendamento from './components/FormularioAgendamento';
import './App.css';

interface Agendamento {
    id: number;
    data_inicio: string;
    dias_necessarios: number;
    pc_numero: string;
    agendado_por: string;
    // O PIN não está na interface do front-end por questões de segurança
}

export default function HomePage() {
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAgendamentos = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/agendamentos');
            if (response.ok) {
                const data = await response.json();
                setAgendamentos(data);
            }
        } catch (error) {
            console.error("Erro ao carregar agendamentos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelamento = async (id: number) => {
        // 1. Solicita o PIN ao usuário
        const pinDigitado = prompt("Para cancelar, digite o PIN de liberação:");

        if (!pinDigitado) {
            alert("Operação cancelada.");
            return;
        }

        // 2. Envia a requisição DELETE para a API
        try {
            const response = await fetch(`/api/agendamentos?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pinDigitado }), // O PIN é enviado no corpo
            });

            const result = await response.json();

            if (response.ok) {
                // 3. Sucesso: recarrega a lista
                alert(`Agendamento ${id} cancelado com sucesso!`);
                fetchAgendamentos();
            } else if (response.status === 403) {
                // 4. PIN Incorreto (Erro 403 retornado pela API)
                alert(`Falha no Cancelamento: ${result.error || 'PIN incorreto.'}`);
            } else {
                // 5. Outros erros (400, 500, 503)
                alert(`Erro ao cancelar: ${result.error || 'Erro desconhecido.'}`);
            }

        } catch (error) {
            console.error("Erro na requisição DELETE:", error);
            alert("Erro de conexão com o servidor ao tentar cancelar.");
        }
    };

    useEffect(() => {
        fetchAgendamentos();
    }, []);

    return (
        <main className="app-container">
            <div className="main-card">
                <header className="header">
                    <div className="header-logo-container">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" className="w-12 h-12">
                            <path d="M4 .5a.5.5 0 0 0-1 0V1H2a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-1V.5a.5.5 0 0 0-1 0V1H4V.5zm-.5 3h9a.5.5 0 0 0 0-1h-9a.5.5 0 0 0 0 1z"/>
                            <path d="M1 8v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8H1zm-1 0a1 1 0 0 0 1-1h14a1 1 0 0 0 1 1H0z"/>
                        </svg>
                        <div>
                            <h1 className="header-title">Agendamento de Servidores</h1>
                            <p className="header-subtitle">Laboratório de Sistemas de Energia Elétrica</p>
                        </div>
                    </div>
                </header>
                <div className="content-section">
                    <FormularioAgendamento onAgendamentoSucesso={fetchAgendamentos} />
                    <h2 className="section-title">Agendamentos Existentes</h2>
                    {loading ? (
                        <p>Carregando agendamentos...</p>
                    ) : (
                        <div className="table-container">
                            <table className="agendamentos-table">
                                <thead>
                                <tr>
                                    <th>Data Início</th>
                                    <th>Dias Necessários</th>
                                    <th>Nº PC</th>
                                    <th>Agendado por</th>
                                    <th>Ação</th>
                                </tr>
                                </thead>
                                <tbody>
                                {agendamentos.map((agendamento) => (
                                    <tr key={agendamento.id}>
                                        <td>{agendamento.data_inicio}</td>
                                        <td>{agendamento.dias_necessarios}</td>
                                        <td>
                                                <span className={`pc-tag ${
                                                    agendamento.pc_numero === 'PC 094' ? 'blue' :
                                                        agendamento.pc_numero === 'PC 095' ? 'purple' :
                                                            'green'
                                                }`}>
                                                    {agendamento.pc_numero}
                                                </span>
                                        </td>
                                        <td>{agendamento.agendado_por}</td>
                                        <td>
                                            <button onClick={() => handleCancelamento(agendamento.id)} className="cancel-button">
                                                Cancelar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}