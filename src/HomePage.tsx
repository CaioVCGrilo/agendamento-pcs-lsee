import React from 'react';
import FormularioAgendamento from './components/FormularioAgendamento';
import './App.css';

// Função utilitária para calcular a data de fim
const calcularDataFim = (dataInicio: string, dias: string) => {
    const [dia, mes, ano] = dataInicio.split('/').map(Number);
    const data = new Date(ano, mes - 1, dia);
    data.setDate(data.getDate() + (Number(dias) - 1));

    const finalDay = String(data.getDate()).padStart(2, '0');
    const finalMonth = String(data.getMonth() + 1).padStart(2, '0');
    const finalYear = data.getFullYear();

    return `${finalDay}/${finalMonth}/${finalYear}`;
};

interface Agendamento {
    id: number;
    dataInicio: string;
    dias: string;
    horaInicio: string;
    horaFim: string;
    pc: string;
    agendadoPor: string;
}

const agendamentosMock: Agendamento[] = [
    {
        id: 1,
        dataInicio: '28/05/2025',
        dias: '1',
        horaInicio: '00h',
        horaFim: '23:59h',
        pc: 'PC 094',
        agendadoPor: 'Caio Vinicius'
    },
    {
        id: 2,
        dataInicio: '28/05/2025',
        dias: '3',
        horaInicio: '00h',
        horaFim: '23:59h',
        pc: 'PC 095',
        agendadoPor: 'Caio Vinicius'
    },
    {
        id: 3,
        dataInicio: '28/05/2025',
        dias: '5',
        horaInicio: '00h',
        horaFim: '23:59h',
        pc: 'PC 083',
        agendadoPor: 'Alailton Alves'
    },
];

const handleCancelamento = (id: number) => {
    const pinDigitado = prompt("Para cancelar, digite o PIN de liberação:");

    // Validação simulada do PIN
    if (pinDigitado === "1234") { // Apenas um exemplo de PIN fixo
        alert(`Agendamento com ID ${id} foi cancelado com sucesso!`);
        // Futuramente, a lógica de API para remover o agendamento será adicionada aqui.
    } else {
        alert("PIN incorreto. O agendamento não foi cancelado.");
    }
};

export default function HomePage() {
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
                    <FormularioAgendamento />

                    <h2 className="section-title">Agendamentos Existentes</h2>

                    <div className="table-container">
                        <table className="agendamentos-table">
                            <thead>
                            <tr>
                                <th>Data Início</th>
                                <th>Data Fim</th>
                                <th>Horário</th>
                                <th>Nº PC</th>
                                <th>Agendado por</th>
                                <th>Ação</th>
                            </tr>
                            </thead>
                            <tbody>
                            {agendamentosMock.map((agendamento) => (
                                <tr key={agendamento.id}>
                                    <td>{agendamento.dataInicio}</td>
                                    <td>{calcularDataFim(agendamento.dataInicio, agendamento.dias)}</td>
                                    <td>{agendamento.horaInicio} - {agendamento.horaFim}</td>
                                    <td>
                                            <span className={`pc-tag ${
                                                agendamento.pc === 'PC 094' ? 'blue' :
                                                    agendamento.pc === 'PC 095' ? 'purple' :
                                                        'green'
                                            }`}>
                                                {agendamento.pc}
                                            </span>
                                    </td>
                                    <td>{agendamento.agendadoPor}</td>
                                    <td>
                                        <button
                                            onClick={() => handleCancelamento(agendamento.id)}
                                            className="cancel-button"
                                        >
                                            Cancelar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}