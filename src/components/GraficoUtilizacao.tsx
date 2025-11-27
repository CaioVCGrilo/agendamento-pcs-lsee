import React, { useEffect, useState, useCallback } from 'react';
import {
    LineChart,
    Line,
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
    total_reservas: number;
    pcs_distintos: number;
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

const GraficoUtilizacao: React.FC = () => {
    const [periodo, setPeriodo] = useState<Periodo>('semestre');
    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState<StatsResponse | null>(null);
    const [tipoGrafico, setTipoGrafico] = useState<'linha' | 'area'>('area');
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
                    setStatsData(data);
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
        const data = new Date(dataStr + 'T00:00:00');
        
        if (periodo === 'semana' || periodo === 'mes') {
            return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        } else {
            return data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
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
        reservas: item.total_reservas || 0,
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
                        <label>Tipo:</label>
                        <select 
                            value={tipoGrafico} 
                            onChange={(e) => setTipoGrafico(e.target.value as 'linha' | 'area')}
                            className="tipo-select"
                        >
                            <option value="area">Área</option>
                            <option value="linha">Linha</option>
                        </select>
                    </div>
                    <div className="control-group">
                        <label>Período:</label>
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
            </div>

            <div className="estatisticas-resumo">
                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <span className="stat-label">Total de Reservas</span>
                        <span className="stat-value">{statsData.summary?.total_reservas || 0}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⏱️</div>
                    <div className="stat-content">
                        <span className="stat-label">Dias Totais</span>
                        <span className="stat-value">{statsData.summary?.total_dias || 0}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <span className="stat-label">Média de Dias</span>
                        <span className="stat-value">{(statsData.summary?.media_dias || 0).toFixed(1)}</span>
                    </div>
                </div>
                {statsData.pcMaisUsado && (
                    <div className="stat-card highlight">
                        <div className="stat-icon">🏆</div>
                        <div className="stat-content">
                            <span className="stat-label">PC Mais Usado</span>
                            <span className="stat-value">{statsData.pcMaisUsado.pc_numero || 'N/A'}</span>
                            <span className="stat-detail">{statsData.pcMaisUsado.num_reservas || 0} reservas</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grafico-chart">
                <ResponsiveContainer width="100%" height={400}>
                    {tipoGrafico === 'area' ? (
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
                            <Area 
                                type="monotone" 
                                dataKey="pcsDistintos" 
                                stroke="#10b981" 
                                fillOpacity={1} 
                                fill="url(#colorPCs)"
                                name="PCs Distintos"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    ) : (
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                                dataKey="data" 
                                stroke="#6b7280"
                                style={{ fontSize: '12px' }}
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
                            />
                            <Legend 
                                wrapperStyle={{ paddingTop: '20px' }}
                                iconType="circle"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="reservas" 
                                stroke="#2563eb" 
                                strokeWidth={3}
                                dot={{ fill: '#2563eb', r: 4 }}
                                activeDot={{ r: 6 }}
                                name="Reservas"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="pcsDistintos" 
                                stroke="#10b981" 
                                strokeWidth={3}
                                dot={{ fill: '#10b981', r: 4 }}
                                activeDot={{ r: 6 }}
                                name="PCs Distintos"
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default GraficoUtilizacao;

const generateMockStatsData = (periodo: Periodo): StatsResponse => {
    // Gera dados mock com base no período selecionado
    const hoje = new Date();
    const stats: StatData[] = [];
    const diasNoPeriodo = periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : periodo === 'semestre' ? 30 : 30; // Limitar a 30 dias

    for (let i = diasNoPeriodo - 1; i >= 0; i--) {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() - i);

        stats.push({
            data: data.toISOString().split('T')[0],
            total_reservas: Math.floor(Math.random() * 8) + 1,
            pcs_distintos: Math.floor(Math.random() * 4) + 1,
            total_dias_reservados: Math.floor(Math.random() * 15) + 5
        });
    }

    const totalReservas = stats.reduce((acc, item) => acc + (item.total_reservas || 0), 0);
    const totalDias = stats.reduce((acc, item) => acc + (item.total_dias_reservados || 0), 0);
    const mediaDias = totalReservas > 0 ? totalDias / totalReservas : 0;
    const totalPcsUsados = 5; // Fixo para mock

    return {
        stats,
        summary: {
            total_reservas: totalReservas || 0,
            total_dias: totalDias || 0,
            media_dias: parseFloat(mediaDias.toFixed(1)) || 0,
            total_pcs_usados: totalPcsUsados || 0
        },
        pcMaisUsado: {
            pc_numero: 'PC 076 (RTDS)',
            num_reservas: Math.floor(totalReservas * 0.4) || 1,
            dias_totais: Math.floor(totalDias * 0.4) || 1
        },
        periodo,
        dataInicio: stats[0]?.data || hoje.toISOString().split('T')[0]
    };
};
