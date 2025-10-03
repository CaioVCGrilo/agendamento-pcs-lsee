'use client';

import React, { useEffect, useState } from 'react';
import FormularioAgendamento from './components/FormularioAgendamento';
import './App.css';

// Remove a função de cálculo de data, pois faremos isso no backend.
// Remove os dados simulados (agendamentosMock).

interface Agendamento {
    id: number;
    data_inicio: string; // Corrigido para a coluna do banco de dados
    dias_necessarios: number; // Corrigido para a coluna do banco de dados
    pc_numero: string;
    agendado_por: string;
    pin: string;
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
        const pinDigitado = prompt("Para cancelar, digite o PIN de liberação:");
        // Lógica de cancelamento (será implementada na API)
        // Por enquanto, apenas um alerta
        alert("A lógica de cancelamento real será implementada aqui.");
    };

    useEffect(() => {
        fetchAgendamentos();
    }, []);

    return (
        <main className="app-container">
            <div className="main-card">
                <header className="header">
                    <div className="header-logo-container">
                        {/* ... (código do cabeçalho) ... */}
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