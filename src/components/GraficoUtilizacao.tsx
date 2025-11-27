import React, { useEffect, useState, useCallback } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import './GraficoUtilizacao.css';

interface StatData {
    data: string;
    pcs_distintos: number;
    total_reservas_ativas: number;
    total_dias_reservados: number;
}

interface Summary {
    total_reservas: number;
    total_dias: number;
    media_dias: number;
    total_pcs_usados: number;
}

interface PcMaisUsado {
    pc_numero: string;
    num_reservas: number;
    dias_totais: number;
}

interface StatsResponse {
    stats: StatData[];
    summary: Summary;
    pcMaisUsado: PcMaisUsado | null;
    periodo: string;
    dataInicio: string;
}

type Periodo = 'semana' | 'mes' | 'semestre' | 'ano';

// Função para gerar dados mock - MOVIDA PARA CIMA
const generateMockStatsData = (periodo: Periodo): StatsResponse => {
    const hoje = new Date();
    const stats: StatData[] = [];

    // Definir número de dias e intervalo baseado no período
    let diasNoPeriodo: number;
    let intervalo: number; // Agregar dados a cada X dias

    switch (periodo) {
        case 'semana':
            diasNoPeriodo = 7;
            intervalo = 1; // Mostrar todos os dias
            break;
        case 'mes':
            diasNoPeriodo = 30;
            intervalo = 1; // Mostrar todos os dias
            break;
        case 'semestre':
            diasNoPeriodo = 180;
            intervalo = 7; // Agregar por semana
            break;
        case 'ano':
            diasNoPeriodo = 365;
            intervalo = 15; // Agregar por quinzena
            break;
        default:
            diasNoPeriodo = 180;
            intervalo = 7;
    }

    // Calcular data de início baseado no período
    const dataInicio = new Date(hoje);
    switch (periodo) {
        case 'semana':
            dataInicio.setDate(hoje.getDate() - 7);
            break;
        case 'mes':
            dataInicio.setMonth(hoje.getMonth() - 1);
            break;
        case 'semestre':
            dataInicio.setMonth(hoje.getMonth() - 6);
            break;
        case 'ano':
            dataInicio.setFullYear(hoje.getFullYear() - 1);
            break;
    }

    // Gerar dados agregados a partir da data de início
    for (let i = 0; i <= diasNoPeriodo; i += intervalo) {
        const data = new Date(dataInicio);
        data.setDate(dataInicio.getDate() + i);

        // Não adicionar datas futuras
        if (data > hoje) break;

        // Gerar dados diferentes baseados no período (mais dados para períodos maiores)
        const multiplicador = periodo === 'semana' ? 1 : periodo === 'mes' ? 1.5 : periodo === 'semestre' ? 2 : 2.5;

        stats.push({
            data: data.toISOString().split('T')[0], // Formato YYYY-MM-DD
            total_reservas_ativas: Math.floor(Math.random() * 8 * multiplicador) + 1,
            pcs_distintos: Math.floor(Math.random() * 4) + 1,
            total_dias_reservados: Math.floor(Math.random() * 15 * multiplicador) + 5
        });
    }

    const totalReservas = Number(stats.reduce((acc, item) => acc + (item.total_reservas_ativas || 0), 0));
    const totalDias = Number(stats.reduce((acc, item) => acc + (item.total_dias_reservados || 0), 0));
    const mediaDias = totalReservas > 0 ? Number((totalDias / totalReservas).toFixed(1)) : 0;
    const totalPcsUsados = Math.max(...stats.map(item => item.pcs_distintos), 1);

    return {
        stats,
        summary: {
            total_reservas: Number(totalReservas) || 0,
            total_dias: Number(totalDias) || 0,
            media_dias: Number(mediaDias) || 0,
            total_pcs_usados: Number(totalPcsUsados) || 0
        },
        pcMaisUsado: {
            pc_numero: 'PC 076 (RTDS)',
            num_reservas: Number(Math.floor(totalReservas * 0.4)) || 1,
            dias_totais: Number(Math.floor(totalDias * 0.4)) || 1
        },
        periodo,
        dataInicio: stats[0]?.data || hoje.toISOString().split('T')[0]
    };
};

const GraficoUtilizacao: React.FC = () => {
    const [periodo, setPeriodo] = useState<Periodo>('semestre');
    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState<StatsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchStatistics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/agendamentos?stats=true&periodo=${periodo}`);
            if (response.ok) {
                const data = await response.json();
                console.log('Dados recebidos da API:', data);

                // Validar estrutura dos dados
                if (!data || !data.summary) {
                    console.error('Dados inválidos recebidos da API');
                    setStatsData(generateMockStatsData(periodo));
                } else {
                    // Normalizar todos os valores numéricos para garantir que sejam números
                    const normalizedData: StatsResponse = {
                        ...data,
                        stats: (data.stats || []).map((item: any) => ({
                            data: item.data,
                            total_reservas_ativas: Number(item.total_reservas_ativas || 0),
                            pcs_distintos: Number(item.pcs_distintos || 0),
                            total_dias_reservados: Number(item.total_dias_reservados || 0)
                        })),
                        summary: {
                            total_reservas: Number(data.summary?.total_reservas || 0),
                            total_dias: Number(data.summary?.total_dias || 0),
                            media_dias: Number(data.summary?.media_dias || 0),
                            total_pcs_usados: Number(data.summary?.total_pcs_usados || 0)
                        },
                        pcMaisUsado: data.pcMaisUsado ? {
                            pc_numero: data.pcMaisUsado.pc_numero || 'N/A',
                            num_reservas: Number(data.pcMaisUsado.num_reservas || 0),
                            dias_totais: Number(data.pcMaisUsado.dias_totais || 0)
                        } : null
                    };
                    console.log('Dados normalizados:', normalizedData);
                    setStatsData(normalizedData);
                }
            } else {
                console.error("Erro na resposta da API:", response.status, response.statusText);
                const errorText = await response.text();
                console.error("Erro detalhado:", errorText);
                // Fallback para dados mock
                setStatsData(generateMockStatsData(periodo));
            }
        } catch (error) {
            console.error("Erro ao carregar estatísticas:", error);
            setError('Erro ao carregar dados. Usando dados de exemplo.');
            // Fallback para dados mock quando não há API
            setStatsData(generateMockStatsData(periodo));
        } finally {
            setLoading(false);
        }
    }, [periodo]);

    useEffect(() => {
        fetchStatistics();
    }, [fetchStatistics]);

    const formatarData = (dataStr: string) => {
        try {
            // Verificar se dataStr é válida
            if (!dataStr) {
                console.error('Data inválida recebida:', dataStr);
                return 'Data Inválida';
            }

            let data;

            // Verificar se é uma data ISO completa (com T e Z)
            if (dataStr.includes('T') && dataStr.includes('Z')) {
                // Já é uma data ISO completa, usar diretamente
                data = new Date(dataStr);
            } else {
                // É apenas uma data YYYY-MM-DD, adicionar tempo
                data = new Date(dataStr + 'T00:00:00');
            }

            // Verificar se a data é válida
            if (isNaN(data.getTime())) {
                console.error('Data não pôde ser parseada:', dataStr);
                return 'Data Inválida';
            }

            // Melhorar formatação baseada no período para evitar sobreposição
            if (periodo === 'semana') {
                // Semana: mostrar dia e mês (ex: 15/11)
                return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            } else if (periodo === 'mes') {
                // Mês: mostrar dia e mês (ex: 15/11)
                return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            } else if (periodo === 'semestre') {
                // Semestre: mostrar mês e ano (ex: nov/25)
                return data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            } else {
                // Ano: mostrar mês e ano (ex: nov/25)
                return data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            }
        } catch (error) {
            console.error('Erro ao formatar data:', dataStr, error);
            return 'Erro';
        }
    };


    if (loading) {
        return (
            <div className="grafico-container">
                <div className="grafico-loading">
                    <p>Carregando estatísticas...</p>
                </div>
            </div>
        );
    }

    if (!statsData || !statsData.stats || statsData.stats.length === 0) {
        return (
            <div className="grafico-container">
                <div className="grafico-header">
                    <h2 className="grafico-title">Estatísticas de Utilização</h2>
                    <div className="grafico-controls">
                        <select 
                            value={periodo} 
                            onChange={(e) => setPeriodo(e.target.value as Periodo)}
                            className="periodo-select"
                        >
                            <option value="semana">Última Semana</option>
                            <option value="mes">Último Mês</option>
                            <option value="semestre">Últimos 6 Meses</option>
                            <option value="ano">Último Ano</option>
                        </select>
                    </div>
                </div>
                <div className="grafico-empty">
                    <p>Nenhum dado disponível para o período selecionado.</p>
                </div>
            </div>
        );
    }

    // Garantir que os dados estão válidos
    const chartData = statsData.stats.map(item => ({
        data: formatarData(item.data),
        reservas: item.total_reservas_ativas || 0,
        pcsDistintos: item.pcs_distintos || 0,
        diasReservados: item.total_dias_reservados || 0
    }));

    return (
        <div className="grafico-container">
            {error && (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    color: '#92400e'
                }}>
                    ⚠️ {error}
                </div>
            )}
            <div className="grafico-header">
                <h2 className="grafico-title">📊 Estatísticas de Utilização dos Recursos</h2>
                <div className="grafico-controls">
                    <div className="control-group">
                        <label>Período:</label>
                        <select 
                            value={periodo} 
                            onChange={(e) => {
                                const novoPeriodo = e.target.value as Periodo;
                                console.log('Período alterado de', periodo, 'para', novoPeriodo);
                                setPeriodo(novoPeriodo);
                            }}
                            className="periodo-select"
                        >
                            <option value="semana">Última Semana</option>
                            <option value="mes">Último Mês</option>
                            <option value="semestre">Últimos 6 Meses</option>
                            <option value="ano">Último Ano</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="estatisticas-resumo">
                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <span className="stat-label">Total de Reservas</span>
                        <span className="stat-value">{Number(statsData.summary?.total_reservas || 0)}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⏱️</div>
                    <div className="stat-content">
                        <span className="stat-label">Dias Totais</span>
                        <span className="stat-value">{Number(statsData.summary?.total_dias || 0)}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <span className="stat-label">Média de Dias</span>
                        <span className="stat-value">{Number(statsData.summary?.media_dias || 0).toFixed(1)}</span>
                    </div>
                </div>
                {statsData.pcMaisUsado && (
                    <div className="stat-card highlight">
                        <div className="stat-icon">🏆</div>
                        <div className="stat-content">
                            <span className="stat-label">PC Mais Usado</span>
                            <span className="stat-value">{statsData.pcMaisUsado.pc_numero || 'N/A'}</span>
                            <span className="stat-detail">{Number(statsData.pcMaisUsado.num_reservas || 0)} reservas</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grafico-chart">
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorReservas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorPCs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="data"
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                            }}
                            formatter={(value: any, name: string) => {
                                if (name === 'Reservas') return [value, 'Reservas'];
                                if (name === 'PCs Distintos') return [value, 'PCs Distintos'];
                                if (name === 'Dias Reservados') return [value, 'Dias Reservados'];
                                return [value, name];
                            }}
                            labelFormatter={(label: string) => `Data: ${label}`}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />
                        <Area
                            type="monotone"
                            dataKey="reservas"
                            stroke="#2563eb"
                            fillOpacity={1}
                            fill="url(#colorReservas)"
                            name="Reservas"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default GraficoUtilizacao;
