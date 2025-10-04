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

// Lista de todos os PCs no laboratório (MESMA LISTA DO BACKEND)
const TODOS_PCS = ['PC 082', 'PC 083', 'PC 094', 'PC 095'];

// Adicione a interface para as props
interface FormularioAgendamentoProps {
    onAgendamentoSucesso: () => void;
}

export default function FormularioAgendamento({ onAgendamentoSucesso }: FormularioAgendamentoProps) {
    const [dataInicial, setDataInicial] = useState(getTodayDate());
    const [diasNecessarios, setDiasNecessarios] = useState('1');
    const [pc, setPc] = useState('');
    const [nome, setNome] = useState('');
    const [pin, setPin] = useState('');

    // Novos estados para gerenciar a disponibilidade
    const [pcsDisponiveis, setPcsDisponiveis] = useState<string[]>(TODOS_PCS);
    const [loadingDisponibilidade, setLoadingDisponibilidade] = useState(false);


    // EFEITO: Monitora mudanças na data e dias para buscar PCs disponíveis
    useEffect(() => {
        const fetchDisponibilidade = async () => {
            // Verifica se os inputs são válidos para evitar requisições desnecessárias
            if (!dataInicial || diasNecessarios === '0' || !diasNecessarios || parseInt(diasNecessarios) > 15) {
                setPcsDisponiveis(TODOS_PCS);
                return;
            }

            setLoadingDisponibilidade(true);
            try {
                // Chama a nova API de verificação de disponibilidade
                const response = await fetch(`/api/agendamentos?dataInicial=${dataInicial}&diasNecessarios=${diasNecessarios}`);

                if (response.ok) {
                    const availablePcs = await response.json();
                    setPcsDisponiveis(availablePcs);

                    // Se o PC selecionado não estiver mais disponível, limpa a seleção
                    if (pc && !availablePcs.includes(pc)) {
                        setPc('');
                    }

                } else {
                    // Em caso de falha da API, retorna à lista completa e mostra erro no console
                    setPcsDisponiveis(TODOS_PCS);
                    console.error("Falha ao buscar disponibilidade. Usando lista completa como fallback.");
                }
            } catch (error) {
                console.error("Erro de rede ao buscar disponibilidade:", error);
                setPcsDisponiveis(TODOS_PCS);
            } finally {
                setLoadingDisponibilidade(false);
            }
        };

        // Adiciona um pequeno delay (500ms) para evitar muitas requisições rápidas ao digitar
        const timer = setTimeout(() => {
            fetchDisponibilidade();
        }, 500);

        return () => clearTimeout(timer); // Limpa o timer no próximo ciclo
    }, [dataInicial, diasNecessarios, pc]); // A dependência 'pc' garante que a seleção seja limpa

    // Determina o texto de status de disponibilidade
    const getDisponibilidadeStatus = () => {
        if (loadingDisponibilidade) return ' (Verificando...)';
        if (pcsDisponiveis.length === 0) return ' (Nenhum disponível)';
        if (pcsDisponiveis.length === TODOS_PCS.length) return ' (Todos disponíveis)';
        return ` (${pcsDisponiveis.length} disponíveis)`;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Verificação final de disponibilidade antes de submeter
        if (pcsDisponiveis.length > 0 && !pcsDisponiveis.includes(pc)) {
            alert(`O PC ${pc} não está disponível para este período. Por favor, selecione uma opção válida.`);
            return;
        }

        // 2. Verifica se o usuário pode tentar agendar (se há algo disponível)
        if (pcsDisponiveis.length === 0) {
            alert(`Nenhum PC disponível para o período selecionado. Por favor, ajuste a data ou os dias.`);
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
                // TRATAMENTO DE CONFLITO 409 (Erro já validado na API)
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
                // Outros Erros (400, 503, 500)
                alert(`Erro ao agendar: ${result.error || 'Erro desconhecido.'}`);
            }
        } catch (error) {
            alert('Erro de conexão com o servidor.');
            console.error('Erro ao enviar formulário:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-card">
            <h2 className="form-title">Reservar um Servidor</h2>

            <div className="form-group-modern">
                <label htmlFor="dataInicial" className="form-label-modern">Data Inicial</label>
                <div className="form-input-wrapper">
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
                    {getDisponibilidadeStatus()}
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
                    <input
                        type="text"
                        id="nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="form-input-modern"
                        required
                    />
                </div>
            </div>

            <div className="form-group-modern">
                <label htmlFor="pin" className="form-label-modern">PIN de Liberação</label>
                <div className="form-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M3.5 11.5a.5.5 0 0 1 0-1h9a.5.5 0 0 1 0 1h-9zm-1-3a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm-1-3a.5.5 0 0 1 0-1h13a.5.5 0 0 1 0 1h-13z"/>
                        <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm0-1h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                    </svg>
                    <input
                        type="text"
                        id="pin"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="form-input-modern"
                        required
                    />
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