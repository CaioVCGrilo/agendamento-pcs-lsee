'use client';

import React, { useEffect, useState } from 'react';
import FormularioAgendamento from './components/FormularioAgendamento';
import './App.css';

// Função utilitária para calcular a data de término
const calcularDataTermino = (dataInicioStr: string, diasNecessarios: number): string => {
    // 1. Converte a string YYYY-MM-DD para um objeto Date
    const data = new Date(dataInicioStr + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário

    // 2. Adiciona o número de dias. Subtrai 1 porque o dia de início já conta.
    data.setDate(data.getDate() + (diasNecessarios - 1));

    // 3. Formata para o padrão DD/MM/YYYY
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();

    return `${dia}/${mes}/${ano}`;
};

interface Agendamento {
    id: number;
    data_inicio: string;
    dias_necessarios: number;
    pc_numero: string;
    agendado_por: string;
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

        if (!pinDigitado) {
            alert("Operação cancelada.");
            return;
        }

        try {
            const response = await fetch(`/api/agendamentos?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pinDigitado }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(`Agendamento ${id} cancelado com sucesso!`);
                fetchAgendamentos();
            } else if (response.status === 403 || response.status === 404) {
                alert(`Falha no Cancelamento: ${result.error || 'PIN ou ID incorreto.'}`);
            } else {
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
                                    <th>Início</th> {/* Simplificado */}
                                    <th>Término</th> {/* Novo título */}
                                    <th>Nº PC</th>
                                    <th>Agendado por</th>
                                    <th>Ação</th>
                                </tr>
                                </thead>
                                <tbody>
                                {agendamentos.map((agendamento) => {
                                    // Formata a data de início para exibição
                                    const dataInicioFormatada = agendamento.data_inicio ? new Date(agendamento.data_inicio).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '';

                                    // Calcula a data de término
                                    const dataTerminoFormatada = agendamento.data_inicio && agendamento.dias_necessarios
                                        ? calcularDataTermino(agendamento.data_inicio, agendamento.dias_necessarios)
                                        : 'N/A';

                                    return (
                                        <tr key={agendamento.id}>
                                            {/* Adicione o data-label aqui: */}
                                            <td data-label="Início">{dataInicioFormatada}</td>
                                            <td data-label="Término">{dataTerminoFormatada}</td>
                                            <td data-label="Nº PC">
                    <span className={`pc-tag ${
                        agendamento.pc_numero === 'PC 094' ? 'blue' :
                            agendamento.pc_numero === 'PC 082' ? 'orange' :
                            agendamento.pc_numero === 'PC 095' ? 'purple' :
                                'green'
                    }`}>
                        {agendamento.pc_numero}
                    </span>
                                            </td>
                                            <td data-label="Agendado por">{agendamento.agendado_por}</td>
                                            <td data-label="Ação">
                                                <button onClick={() => handleCancelamento(agendamento.id)} className="cancel-button">
                                                    Cancelar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}