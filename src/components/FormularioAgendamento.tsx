import React, { useState, useEffect } from 'react';
import './Formulario.css';

// Função para formatar a data de hoje para o formato YYYY-MM-DD
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Interface para as props
interface FormularioAgendamentoProps {
    onAgendamentoSucesso: () => void;
}

// Lista de todos os PCs para o caso de falha na API ou sem seleção
const TODOS_PCS = ['PC 094', 'PC 095', 'PC 083', 'PC 084', 'PC 085'];

export default function FormularioAgendamento({ onAgendamentoSucesso }: FormularioAgendamentoProps) {
    const [dataInicial, setDataInicial] = useState(getTodayDate());
    const [diasNecessarios, setDiasNecessarios] = useState('1');
    const [pc, setPc] = useState('');
    const [nome, setNome] = useState('');
    const [pin, setPin] = useState('');
    const [pcsDisponiveis, setPcsDisponiveis] = useState<string[]>(TODOS_PCS);
    const [loadingDisponibilidade, setLoadingDisponibilidade] = useState(false);

    // EFEITO: Monitora mudanças na data e dias para buscar PCs disponíveis
    useEffect(() => {
        const fetchDisponibilidade = async () => {
            if (!dataInicial || diasNecessarios === '0' || !diasNecessarios) {
                setPcsDisponiveis(TODOS_PCS);
                setPc(''); // Limpa a seleção
                return;
            }

            setLoadingDisponibilidade(true);
            try {
                // Chama a nova API de verificação de disponibilidade
                const response = await fetch(`/api/agendamentos?dataInicial=${dataInicial}&diasNecessarios=${diasNecessarios}`);

                if (response.ok) {
                    const availablePcs = await response.json();
                    setPcsDisponiveis(availablePcs);

                    if (pc && !availablePcs.includes(pc)) {
                        setPc('');
                    }

                    if (availablePcs.length === 0) {
                        alert(`❌ Não há PCs disponíveis para o período de ${diasNecessarios} dias a partir de ${new Date(dataInicial).toLocaleDateString('pt-BR')}.`);
                    }

                } else {
                    setPcsDisponiveis(TODOS_PCS);
                    console.error("Falha ao buscar disponibilidade.");
                }
            } catch (error) {
                console.error("Erro de rede ao buscar disponibilidade:", error);
                setPcsDisponiveis(TODOS_PCS);
            } finally {
                setLoadingDisponibilidade(false);
            }
        };

        const timer = setTimeout(() => {
            fetchDisponibilidade();
        }, 500);

        return () => clearTimeout(timer);
    }, [dataInicial, diasNecessarios, pc]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (pcsDisponiveis.length > 0 && !pcsDisponiveis.includes(pc)) {
            alert(`O PC ${pc} não está disponível para este período. Por favor, selecione uma opção válida.`);
            return;
        }

        try {
            const response = await fetch('/api/agendamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataInicial, diasNecessarios, pc, nome, pin }),
            });

            const result = await response.json();

            if (response.ok) {
                alert('Agendamento criado com sucesso!');
                setDataInicial(getTodayDate());
                setDiasNecessarios('1');
                setPc('');
                setNome('');
                setPin('');
                onAgendamentoSucesso();
            } else if (response.status === 409) {
                const conflito = result.conflito;

                const dataFim = new Date(conflito.data_inicio);
                dataFim.setDate(dataFim.getDate() + conflito.dias_necessarios);

                const dataFimStr = dataFim.toLocaleDateString('pt-BR');
                const dataInicioStr = new Date(conflito.data_inicio).toLocaleDateString('pt-BR');

                alert(
                    `❌ Conflito de Agendamento!\n\n` +
                    `${result.message}\n` +
                    `Reservado por: ${conflito.agendado_por}\n` +
                    `Período: ${dataInicioStr} até ${dataFimStr}`
                );
            } else {
                alert(`Erro ao agendar: ${result.error || 'Erro desconhecido.'}`);
            }
        } catch (error) {
            alert('Erro de conexão com o servidor.');
            console.error('Erro ao enviar formulário:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-card">
            <h2 className="form-title">Agendar um Computador</h2>

            <div className="form-group-modern">
                <label htmlFor="dataInicial" className="form-label-modern">Data Inicial</label>
                <div className="form-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M6 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zM7.5 7a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1zM5 8a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 1 0v-2A.5.5 0 0 0 5 8zm2.5-.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5zM10 7.5a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1z"/>
                        <path d="M11 1.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zM12.5 5a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1z"/>
                        <path d="M3.5 1.5a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 .5-.5zM4 5a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1H4z"/>
                        <path d="M11 1.5a.5.5 0 0 0 .5-.5h-4a.5.5 0 0 0 0-1h4a.5.5 0 0 0 .5.5zM12.5 5a.5.5 0 0 0 0 1h-1a.5.5 0 0 0 0-1h1z"/>
                        <path d="M4.5 1.5a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 .5-.5zM5 5a.5.5 0 0 0 0 1h-1a.5.5 0 0 0 0-1h1z"/>
                        <path d="M7.5 1.5a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 .5-.5zM8 5a.5.5 0 0 0 0 1h-1a.5.5 0 0 0 0-1h1z"/>
                    </svg>
                    <input
                        type="date"
                        id="dataInicial"
                        value={dataInicial}
                        onChange={(e) => setDataInicial(e.target.value)}
                        className="form-input-modern"
                        required
                    />
                </div>
            </div>

            <div className="form-group-modern">
                <label htmlFor="diasNecessarios" className="form-label-modern">Dias Necessários</label>
                <div className="form-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                    </svg>
                    <input
                        type="number"
                        id="diasNecessarios"
                        value={diasNecessarios}
                        onChange={(e) => setDiasNecessarios(e.target.value)}
                        className="form-input-modern"
                        required
                        min="1"
                        max="15"
                    />
                </div>
            </div>

            <div className="form-group-modern">
                <label htmlFor="pc" className="form-label-modern">Número do PC
                    {loadingDisponibilidade ? ' (Verificando...)' : pcsDisponiveis.length === 0 ? ' (Nenhum disponível)' : ''}
                </label>
                <div className="form-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
                        <path d="M8 12.5a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H8.5a.5.5 0 0 1-.5-.5z"/>
                    </svg>
                    <select
                        id="pc"
                        value={pc}
                        onChange={(e) => setPc(e.target.value)}
                        className="form-input-modern"
                        required
                        disabled={loadingDisponibilidade || pcsDisponiveis.length === 0}
                    >
                        <option value="">
                            {pcsDisponiveis.length === 0 ? 'NENHUM DISPONÍVEL' : 'Selecione um PC'}
                        </option>
                        {pcsDisponiveis.map(pc => (
                            <option key={pc} value={pc}>{pc}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="form-group-modern">
                <label htmlFor="nome" className="form-label-modern">Agendado por</label>
                <div className="form-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                    </svg>
                    <input type="text" id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className="form-input-modern" required />
                </div>
            </div>

            <div className="form-group-modern">
                <label htmlFor="pin" className="form-label-modern">PIN de Liberação</label>
                <div className="form-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M3.5 11.5a.5.5 0 0 1 0-1h9a.5.5 0 0 1 0 1h-9zm-1-3a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm-1-3a.5.5 0 0 1 0-1h13a.5.5 0 0 1 0 1h-13z"/>
                        <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm0-1h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                    </svg>
                    <input type="text" id="pin" value={pin} onChange={(e) => setPin(e.target.value)} className="form-input-modern" required />
                </div>
            </div>

            <button
                type="submit"
                className="form-button-modern"
                disabled={pcsDisponiveis.length === 0 || loadingDisponibilidade}
            >
                {pcsDisponiveis.length === 0 ? 'Nenhum PC Disponível' : 'Confirmar Agendamento'}
            </button>
        </form>
    );
}