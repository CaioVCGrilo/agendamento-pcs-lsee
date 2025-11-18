'use client';

import React, { useEffect, useState, useRef } from 'react';
import FormularioAgendamento from './components/FormularioAgendamento';
import './App.css';

// Utility function to calculate the end date
const calcularDataTermino = (dataInicioStr: string, diasNecessarios: number): Date => {
    // 1. Convert the YYYY-MM-DD string to a Date object
    const data = new Date(dataInicioStr + 'T00:00:00');
    data.setDate(data.getDate() + (diasNecessarios - 1));
    return data;
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
    const [totalAgendamentos, setTotalAgendamentos] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // Referência para função de atualização da disponibilidade
    const atualizarDisponibilidadeRef = useRef<null | (() => void)>(null);

    // Função para ser passada ao FormularioAgendamento
    const setAtualizarDisponibilidade = (fn: () => void) => {
        atualizarDisponibilidadeRef.current = fn;
    };

    const fetchAgendamentos = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/agendamentos');
            if (response.ok) {
                const data = await response.json();
                setAgendamentos(data.agendamentos || data);
                setTotalAgendamentos(data.totalAgendamentos || 0);
            }
        } catch (error) {
            console.error("Erro ao carregar agendamentos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelamento = async (id: number) => {
        // Tenta preencher automaticamente o PIN salvo
        let pinDigitado = localStorage.getItem('user_pin') || '';
        if (!pinDigitado) {
            pinDigitado = prompt("Para cancelar, digite o PIN de liberação:") || '';
        }
        // Se ainda não houver PIN, cancela
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
                // Se a resposta indicar refreshDisponiveis, força atualização global
                if (result.refreshDisponiveis && atualizarDisponibilidadeRef.current) {
                    atualizarDisponibilidadeRef.current();
                }
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

    const handleExtensao = async (id: number) => {
        // Solicitar quantos dias de extensão
        const diasExtensaoStr = prompt("Quantos dias deseja estender o agendamento? (1-15)");
        if (!diasExtensaoStr) {
            alert("Operação cancelada.");
            return;
        }

        const diasExtensao = parseInt(diasExtensaoStr);
        if (isNaN(diasExtensao) || diasExtensao < 1 || diasExtensao > 15) {
            alert("Número de dias inválido. Deve ser entre 1 e 15.");
            return;
        }

        // Tenta preencher automaticamente o PIN salvo
        let pinDigitado = localStorage.getItem('user_pin') || '';
        if (!pinDigitado) {
            pinDigitado = prompt("Para estender, digite o PIN de liberação:") || '';
        }
        if (!pinDigitado) {
            alert("Operação cancelada.");
            return;
        }

        try {
            const response = await fetch('/api/agendamentos', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, diasExtensao, pinDigitado }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(`Agendamento ${id} estendido com sucesso! Novo total de dias: ${result.novosDiasNecessarios}`);
                fetchAgendamentos();
                // Se a resposta indicar refreshDisponiveis, força atualização global
                if (result.refreshDisponiveis && atualizarDisponibilidadeRef.current) {
                    atualizarDisponibilidadeRef.current();
                }
            } else if (response.status === 409) {
                const conflito = result.conflito;
                const dataFim = new Date(conflito.data_inicio);
                dataFim.setDate(dataFim.getDate() + conflito.dias_necessarios);
                alert(
                    `❌ Não é possível estender!\n\n` +
                    `${result.message}\n` +
                    `Reservado por: ${conflito.agendado_por}\n` +
                    `Período: ${new Date(conflito.data_inicio).toLocaleDateString('pt-BR')} até ${dataFim.toLocaleDateString('pt-BR')}`
                );
            } else if (response.status === 403 || response.status === 404) {
                alert(`Falha na Extensão: ${result.error || 'PIN ou ID incorreto.'}`);
            } else {
                alert(`Erro ao estender: ${result.error || 'Erro desconhecido.'}`);
            }

        } catch (error) {
            console.error("Erro na requisição PATCH:", error);
            alert("Erro de conexão com o servidor ao tentar estender.");
        }
    };

    useEffect(() => {
        fetchAgendamentos();
    }, []);

    // Adiciona integração global para forçar atualização da lista de PCs disponíveis

    // Get the current year dynamically for the copyright notice
    const currentYear = new Date().getFullYear();

    // Lógica para filtrar agendamentos expirados
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera o horário para a comparação ser somente por data

    const agendamentosValidos = agendamentos.filter(agendamento => {
        const dataTermino = calcularDataTermino(agendamento.data_inicio, agendamento.dias_necessarios);
        return dataTermino >= hoje;
    });

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
                    <FormularioAgendamento onAgendamentoSucesso={fetchAgendamentos} setAtualizarDisponibilidade={setAtualizarDisponibilidade} />

                    <h2 className="section-title">
                        Agendamentos Existentes
                        <span className="total-agendamentos-badge">
                            {totalAgendamentos > 0 && ` • Total de usos: ${totalAgendamentos.toLocaleString('pt-BR')}`}
                        </span>
                    </h2>

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
                                {agendamentosValidos.map((agendamento) => {
                                    // Formata a data de início para exibição
                                    const dataInicioFormatada = agendamento.data_inicio ? new Date(agendamento.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '';

                                    // Calcula a data de término para exibição
                                    const dataTermino = calcularDataTermino(agendamento.data_inicio, agendamento.dias_necessarios);
                                    const dataTerminoFormatada = dataTermino.toLocaleDateString('pt-BR', {timeZone: 'UTC'});

                                    return (
                                        <tr key={agendamento.id}>
                                            <td data-label="Início">{dataInicioFormatada}</td>
                                            <td data-label="Término">{dataTerminoFormatada}</td>
                                            <td data-label="Nº PC">
                                                <span className={`pc-tag ${
                                                    agendamento.pc_numero.startsWith('PC 076') ? 'red' :
                                                    agendamento.pc_numero === 'PC 094' ? 'blue' :
                                                    agendamento.pc_numero === 'PC 082' ? 'orange' :
                                                    agendamento.pc_numero === 'PC 095' ? 'purple' :
                                                    'green'
                                                }`}>
                                                    {agendamento.pc_numero}
                                                </span>
                                            </td>
                                            {/* Corrected the variable name here */}
                                            <td data-label="Agendado por">{agendamento.agendado_por}</td>
                                            <td data-label="Ação">
                                                <div className="action-buttons">
                                                    <button onClick={() => handleExtensao(agendamento.id)} className="extend-button" title="Estender agendamento">
                                                        Estender
                                                    </button>
                                                    <button onClick={() => handleCancelamento(agendamento.id)} className="cancel-button" title="Cancelar agendamento">
                                                        Cancelar
                                                    </button>
                                                </div>
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
            <footer className="footer">
                <p>&copy; {currentYear} LSEE - Laboratório de Sistemas de Energia Elétrica. Todos os direitos reservados.</p>
            </footer>
        </main>
    );
}