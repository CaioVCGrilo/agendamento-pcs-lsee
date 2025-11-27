import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
const crypto = require('crypto');

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const LSEE_EXCEPTION_IP = '143.107.235.10';
const TODOS_PCS = ['PC 076 (RTDS)', 'PC 082', 'PC 083', 'PC 094', 'PC 095'];

async function initializeDatabase() {
    console.log("Tentando inicializar o banco de dados e criar a tabela 'agendamentos'...");
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS agendamentos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            data_inicio DATE NOT NULL,
            dias_necessarios INT NOT NULL,
            pc_numero VARCHAR(50) NOT NULL,
            agendado_por VARCHAR(100) NOT NULL,
            pin VARCHAR(32) NOT NULL,
            ativo BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        await pool.execute(createTableQuery);
        console.log("Tabela 'agendamentos' verificada/criada com sucesso.");

        // Adicionar coluna 'ativo' se a tabela já existir sem ela
        const addColumnQuery = `
            ALTER TABLE agendamentos
                ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
        `;
        await pool.execute(addColumnQuery);
        console.log("Coluna 'ativo' verificada/adicionada com sucesso.");
    } catch (error) {
        console.error("ERRO CRÍTICO: Falha ao inicializar a tabela agendamentos.", error);
    }
}

initializeDatabase();

function checkDbConnection() {
    console.log('Verificando variáveis de ambiente:');
    console.log('MYSQL_HOST:', process.env.MYSQL_HOST ? 'Configurado' : 'NÃO CONFIGURADO');
    console.log('MYSQL_USER:', process.env.MYSQL_USER ? 'Configurado' : 'NÃO CONFIGURADO');
    console.log('MYSQL_PASSWORD:', process.env.MYSQL_PASSWORD ? 'Configurado' : 'NÃO CONFIGURADO');
    console.log('MYSQL_DATABASE:', process.env.MYSQL_DATABASE ? 'Configurado' : 'NÃO CONFIGURADO');

    if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD || !process.env.MYSQL_DATABASE) {
        console.error('Variáveis de ambiente do MySQL não configuradas!');
        return NextResponse.json(
            {
                error: 'Serviço indisponível. Variáveis de ambiente do MySQL não configuradas.',
                details: {
                    MYSQL_HOST: !!process.env.MYSQL_HOST,
                    MYSQL_USER: !!process.env.MYSQL_USER,
                    MYSQL_PASSWORD: !!process.env.MYSQL_PASSWORD,
                    MYSQL_DATABASE: !!process.env.MYSQL_DATABASE
                }
            },
            { status: 503 }
        );
    }
    return null;
}

export async function GET(request) {
    console.log('API chamada:', request.url);

    const connectionError = checkDbConnection();
    if (connectionError) {
        console.log('Erro de conexão com DB');
        return connectionError;
    }

    try {
        const { searchParams } = new URL(request.url);
        console.log('Parâmetros:', Object.fromEntries(searchParams));

        // Endpoint de teste
        if (searchParams.has('test')) {
            console.log('Executando teste de API...');
            return NextResponse.json({
                status: 'API funcionando',
                timestamp: new Date().toISOString(),
                environment: {
                    MYSQL_HOST: !!process.env.MYSQL_HOST,
                    MYSQL_USER: !!process.env.MYSQL_USER,
                    MYSQL_PASSWORD: !!process.env.MYSQL_PASSWORD,
                    MYSQL_DATABASE: !!process.env.MYSQL_DATABASE
                }
            }, { status: 200 });
        }

        // Se tem parâmetro stats, retorna estatísticas
        if (searchParams.has('stats')) {
            console.log('Processando estatísticas...');
            const periodo = searchParams.get('periodo') || 'semestre';
            console.log('Período:', periodo);

            // Se for desenvolvimento ou teste, retornar dados mock
            if (process.env.NODE_ENV !== 'production' || searchParams.has('mock')) {
                console.log('Retornando dados mock para desenvolvimento...');
                const mockData = generateMockStatsData(periodo);
                return NextResponse.json(mockData, { status: 200 });
            }

            let dataInicio;
            const hoje = new Date();
            console.log('Data atual:', hoje.toISOString());

            switch (periodo) {
                case 'semana':
                    dataInicio = new Date(hoje);
                    dataInicio.setDate(hoje.getDate() - 7);
                    break;
                case 'mes':
                    dataInicio = new Date(hoje);
                    dataInicio.setMonth(hoje.getMonth() - 1);
                    break;
                case 'semestre':
                    dataInicio = new Date(hoje);
                    dataInicio.setMonth(hoje.getMonth() - 6);
                    break;
                case 'ano':
                    dataInicio = new Date(hoje);
                    dataInicio.setFullYear(hoje.getFullYear() - 1);
                    break;
                default:
                    dataInicio = new Date(hoje);
                    dataInicio.setMonth(hoje.getMonth() - 6);
            }

            const dataInicioISO = dataInicio.toISOString().split('T')[0];
            console.log('Data início filtro:', dataInicioISO);

            // Query para obter dados agregados por dia
            const statsQuery = `
                SELECT
                    DATE(data_inicio) as data,
                    COUNT(*) as total_reservas,
                    COUNT(DISTINCT pc_numero) as pcs_distintos,
                    SUM(dias_necessarios) as total_dias_reservados
                FROM agendamentos
                WHERE data_inicio >= ?
                GROUP BY DATE(data_inicio)
                ORDER BY DATE(data_inicio) ASC;
            `;

            console.log('Executando query de estatísticas...');
            const [stats] = await pool.execute(statsQuery, [dataInicioISO]);
            console.log('Resultado stats:', stats);

            // Query para estatísticas gerais
            const summaryQuery = `
                SELECT
                    COUNT(*) as total_reservas,
                    SUM(dias_necessarios) as total_dias,
                    AVG(dias_necessarios) as media_dias,
                    COUNT(DISTINCT pc_numero) as total_pcs_usados
                FROM agendamentos
                WHERE data_inicio >= ?;
            `;

            console.log('Executando query de resumo...');
            const [summary] = await pool.execute(summaryQuery, [dataInicioISO]);
            console.log('Resultado summary:', summary);

            // Query para obter o PC mais utilizado
            const pcPopularQuery = `
                SELECT
                    pc_numero,
                    COUNT(*) as num_reservas,
                    SUM(dias_necessarios) as dias_totais
                FROM agendamentos
                WHERE data_inicio >= ?
                GROUP BY pc_numero
                ORDER BY num_reservas DESC
                LIMIT 1;
            `;

            console.log('Executando query de PC popular...');
            const [pcPopular] = await pool.execute(pcPopularQuery, [dataInicioISO]);
            console.log('Resultado PC popular:', pcPopular);

            // Garantir que todos os valores sejam números válidos
            const summaryData = summary[0] || {};
            const responseData = {
                stats,
                summary: {
                    total_reservas: summaryData.total_reservas || 0,
                    total_dias: summaryData.total_dias || 0,
                    media_dias: summaryData.media_dias || 0,
                    total_pcs_usados: summaryData.total_pcs_usados || 0
                },
                pcMaisUsado: pcPopular[0] || null,
                periodo,
                dataInicio: dataInicioISO
            };

            console.log('Retornando dados:', responseData);
            return NextResponse.json(responseData, { status: 200 });
        }

        // Se tem parâmetros dataInicial e diasNecessarios, retorna PCs disponíveis
        if (searchParams.has('dataInicial') && searchParams.has('diasNecessarios')) {
            const dataInicio = searchParams.get('dataInicial');
            const diasNecessarios = parseInt(searchParams.get('diasNecessarios'), 10);

            if (!dataInicio || !diasNecessarios || diasNecessarios < 1) {
                return NextResponse.json(TODOS_PCS, { status: 200 });
            }

            const dataFimReserva = new Date(dataInicio);
            dataFimReserva.setDate(dataFimReserva.getDate() + diasNecessarios - 1);
            const dataFimISO = dataFimReserva.toISOString().split('T')[0];

            const occupiedQuery = `
                SELECT DISTINCT pc_numero
                FROM agendamentos
                WHERE
                    ativo = TRUE AND
                    data_inicio <= ? AND DATE_ADD(data_inicio, INTERVAL dias_necessarios - 1 DAY) >= ?;
            `;

            const [occupiedResult] = await pool.execute(occupiedQuery, [dataFimISO, dataInicio]);
            const occupiedPcs = occupiedResult.map(row => row.pc_numero);
            const availablePcs = TODOS_PCS.filter(pc => !occupiedPcs.includes(pc));

            return NextResponse.json(availablePcs, { status: 200 });
        }

        // Caso padrão: retorna todos os agendamentos ativos
        const today = new Date().toISOString().split('T')[0];

        const [agendamentos] = await pool.execute(
            `SELECT
                 id,
                 DATE_FORMAT(data_inicio, '%Y-%m-%d') AS data_inicio,
                 dias_necessarios,
                 pc_numero,
                 agendado_por
             FROM agendamentos
             WHERE ativo = TRUE AND DATE_ADD(data_inicio, INTERVAL dias_necessarios - 0 DAY) >= ?
             ORDER BY data_inicio ASC;`,
            [today]
        );

        const [totalResult] = await pool.execute(
            `SELECT COUNT(*) as total FROM agendamentos;`
        );
        const totalAgendamentos = totalResult[0].total;

        return NextResponse.json({ agendamentos, totalAgendamentos }, { status: 200 });

    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        console.error('Stack trace:', error.stack);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);

        // Tentar testar a conexão
        try {
            console.log('Testando conexão com o banco...');
            const testConnection = await pool.getConnection();
            console.log('Conexão com banco OK');
            testConnection.release();
        } catch (dbError) {
            console.error('Erro na conexão com banco:', dbError.message);
        }

        return NextResponse.json({
            error: 'Erro ao buscar dados do banco de dados.',
            details: {
                message: error.message,
                code: error.code,
                sqlState: error.sqlState
            }
        }, { status: 503 });
    }
}

export async function POST(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        const { dataInicial, diasNecessarios, pc, nome, pin, codigo_lsee } = await request.json();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const requestDate = new Date(dataInicial + 'T00:00:00');
        requestDate.setHours(0, 0, 0, 0);

        if (requestDate < today) {
            return NextResponse.json(
                { error: 'Não é possível agendar para uma data que já passou.' },
                { status: 400 }
            );
        }

        const clientIP = request.headers.get('x-forwarded-for') || request.ip;
        const lseeCode = process.env.LSEE_CODE;
        let isPinRequired = true;

        if (clientIP === LSEE_EXCEPTION_IP) {
            console.log(`Reserva via IP autorizado (${clientIP}). O PIN não será validado.`);
            isPinRequired = false;
        } else {
            console.log(`Reserva via IP autorizado (${clientIP}). O PIN não será validado.`);
            isPinRequired = false;
        }

        const dataInicio = dataInicial;
        const dias = parseInt(diasNecessarios, 10);

        if (!dataInicio || !dias || !pc || !nome || (isPinRequired && !pin)) {
            return NextResponse.json({ error: 'Dados incompletos. Todos os campos são obrigatórios.' }, { status: 400 });
        }

        const dataFimReserva = new Date(dataInicio);
        dataFimReserva.setDate(dataFimReserva.getDate() + dias - 1);
        const dataFimISO = dataFimReserva.toISOString().split('T')[0];

        const conflictQuery = `
            SELECT id, data_inicio, dias_necessarios, agendado_por
            FROM agendamentos
            WHERE pc_numero = ?
              AND ativo = TRUE
              AND data_inicio <= ? AND DATE_ADD(data_inicio, INTERVAL dias_necessarios - 1 DAY) >= ?
                LIMIT 1;
        `;

        const [conflicts] = await pool.execute(conflictQuery, [pc, dataFimISO, dataInicio]);

        if (conflicts.length > 0) {
            const conflito = conflicts[0];
            const dataFimConflito = new Date(conflito.data_inicio);
            dataFimConflito.setDate(dataFimConflito.getDate() + conflito.dias_necessarios);

            return NextResponse.json({
                error: 'CONFLITO DE AGENDAMENTO',
                message: `O PC ${pc} já está reservado durante este período.`,
                conflito: {
                    agendado_por: conflito.agendado_por,
                    data_inicio: conflito.data_inicio,
                    dias_necessarios: conflito.dias_necessarios
                }
            }, { status: 409 });
        }

        let hashedPin = '';
        if (isPinRequired) {
            hashedPin = crypto.createHash('md5').update(pin).digest('hex');
        } else {
            hashedPin = crypto.createHash('md5').update(pin).digest('hex');
        }

        const insertQuery = `
            INSERT INTO agendamentos (
                data_inicio,
                dias_necessarios,
                pc_numero,
                agendado_por,
                pin
            ) VALUES (?, ?, ?, ?, ?);
        `;

        const [result] = await pool.execute(insertQuery, [dataInicial, dias, pc, nome, hashedPin]);

        return NextResponse.json({
            message: 'Agendamento criado com sucesso!',
            id: result.insertId,
            refreshDisponiveis: true
        }, { status: 201 });

    } catch (error) {
        console.error('Erro ao processar agendamento:', error);
        return NextResponse.json({ error: 'Erro de infraestrutura ao salvar o agendamento.' }, { status: 503 });
    }
}

export async function DELETE(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const { pinDigitado } = await request.json();

        const clientIP = request.headers.get('x-forwarded-for') || request.ip;
        let deleteQuery;
        let queryParams;

        if (!id || !pinDigitado) {
            return NextResponse.json({ error: 'ID e PIN de liberação são obrigatórios.' }, { status: 400 });
        }
        const hashedPinDigitado = crypto.createHash('md5').update(pinDigitado).digest('hex');
        // Soft delete - marcar como inativo em vez de deletar
        deleteQuery = 'UPDATE agendamentos SET ativo = FALSE WHERE id = ? AND pin = ? AND ativo = TRUE';
        queryParams = [id, hashedPinDigitado];

        const [deleteResult] = await pool.execute(deleteQuery, queryParams);

        if (deleteResult.affectedRows === 0) {
            return NextResponse.json({ error: 'PIN ou ID do agendamento incorreto. Cancelamento não autorizado.' }, { status: 403 });
        }

        return NextResponse.json({ message: 'Agendamento cancelado com sucesso.', refreshDisponiveis: true }, { status: 200 });

    } catch (error) {
        console.error('Erro ao processar cancelamento:', error);
        return NextResponse.json({ error: 'Erro de infraestrutura ao cancelar o agendamento.' }, { status: 503 });
    }
}

export async function PATCH(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        const { id, diasExtensao, pinDigitado } = await request.json();

        if (!id || !diasExtensao || !pinDigitado) {
            return NextResponse.json({ error: 'ID, dias de extensão e PIN são obrigatórios.' }, { status: 400 });
        }

        if (diasExtensao < 1 || diasExtensao > 15) {
            return NextResponse.json({ error: 'A extensão deve ser entre 1 e 15 dias.' }, { status: 400 });
        }

        const hashedPinDigitado = crypto.createHash('md5').update(pinDigitado).digest('hex');

        // Buscar o agendamento atual
        const [agendamentoAtual] = await pool.execute(
            `SELECT id, data_inicio, dias_necessarios, pc_numero, pin
             FROM agendamentos
             WHERE id = ? AND ativo = TRUE`,
            [id]
        );

        if (agendamentoAtual.length === 0) {
            return NextResponse.json({ error: 'Agendamento não encontrado ou já foi cancelado.' }, { status: 404 });
        }

        const agendamento = agendamentoAtual[0];

        // Verificar PIN
        if (agendamento.pin !== hashedPinDigitado) {
            return NextResponse.json({ error: 'PIN incorreto. Extensão não autorizada.' }, { status: 403 });
        }

        // Calcular nova data de término
        const dataInicio = agendamento.data_inicio;
        const novosDiasNecessarios = agendamento.dias_necessarios + parseInt(diasExtensao);

        if (novosDiasNecessarios > 30) {
            return NextResponse.json({ error: 'A extensão resultaria em um período total maior que 30 dias.' }, { status: 400 });
        }

        const dataFimNova = new Date(dataInicio);
        dataFimNova.setDate(dataFimNova.getDate() + novosDiasNecessarios - 1);
        const dataFimNovaISO = dataFimNova.toISOString().split('T')[0];

        // Verificar conflitos com outros agendamentos
        const conflictQuery = `
            SELECT id, data_inicio, dias_necessarios, agendado_por
            FROM agendamentos
            WHERE pc_numero = ?
              AND ativo = TRUE
              AND id != ?
              AND data_inicio <= ? AND DATE_ADD(data_inicio, INTERVAL dias_necessarios - 1 DAY) >= ?
                LIMIT 1;
        `;

        const dataFimAtual = new Date(dataInicio);
        dataFimAtual.setDate(dataFimAtual.getDate() + agendamento.dias_necessarios);
        const dataInicioVerificacao = dataFimAtual.toISOString().split('T')[0];

        const [conflicts] = await pool.execute(conflictQuery, [
            agendamento.pc_numero,
            id,
            dataFimNovaISO,
            dataInicioVerificacao
        ]);

        if (conflicts.length > 0) {
            const conflito = conflicts[0];
            return NextResponse.json({
                error: 'CONFLITO DE AGENDAMENTO',
                message: `Não é possível extender. O PC ${agendamento.pc_numero} já está reservado para outro usuário no período solicitado.`,
                conflito: {
                    agendado_por: conflito.agendado_por,
                    data_inicio: conflito.data_inicio,
                    dias_necessarios: conflito.dias_necessarios
                }
            }, { status: 409 });
        }

        // Atualizar o agendamento com os novos dias
        const updateQuery = `
            UPDATE agendamentos
            SET dias_necessarios = ?
            WHERE id = ?;
        `;

        await pool.execute(updateQuery, [novosDiasNecessarios, id]);

        return NextResponse.json({
            message: 'Agendamento estendido com sucesso!',
            novosDiasNecessarios: novosDiasNecessarios,
            refreshDisponiveis: true
        }, { status: 200 });

    } catch (error) {
        console.error('Erro ao processar extensão:', error);
        return NextResponse.json({ error: 'Erro de infraestrutura ao estender o agendamento.' }, { status: 503 });
    }
}

// Função para gerar dados mock de estatísticas
function generateMockStatsData(periodo) {
    const hoje = new Date();
    let dataInicio;
    let numDias;

    switch (periodo) {
        case 'semana':
            dataInicio = new Date(hoje);
            dataInicio.setDate(hoje.getDate() - 7);
            numDias = 7;
            break;
        case 'mes':
            dataInicio = new Date(hoje);
            dataInicio.setMonth(hoje.getMonth() - 1);
            numDias = 30;
            break;
        case 'semestre':
            dataInicio = new Date(hoje);
            dataInicio.setMonth(hoje.getMonth() - 6);
            numDias = 180;
            break;
        case 'ano':
            dataInicio = new Date(hoje);
            dataInicio.setFullYear(hoje.getFullYear() - 1);
            numDias = 365;
            break;
        default:
            dataInicio = new Date(hoje);
            dataInicio.setMonth(hoje.getMonth() - 6);
            numDias = 180;
    }

    const mockStats = [];
    for (let i = 0; i < Math.min(numDias, 30); i++) { // Limitar a 30 dias para não sobrecarregar
        const data = new Date(dataInicio);
        data.setDate(data.getDate() + i);
        mockStats.push({
            data: data.toISOString().split('T')[0],
            total_reservas: Math.floor(Math.random() * 8) + 1,
            pcs_distintos: Math.floor(Math.random() * 4) + 1,
            total_dias_reservados: Math.floor(Math.random() * 15) + 1
        });
    }

    const totalReservas = mockStats.reduce((sum, item) => sum + item.total_reservas, 0);
    const totalDias = mockStats.reduce((sum, item) => sum + item.total_dias_reservados, 0);
    const mediaDias = totalDias / totalReservas || 0;
    const pcsUsados = Math.max(...mockStats.map(item => item.pcs_distintos));

    return {
        stats: mockStats,
        summary: {
            total_reservas: totalReservas,
            total_dias: totalDias,
            media_dias: parseFloat(mediaDias.toFixed(1)),
            total_pcs_usados: pcsUsados
        },
        pcMaisUsado: {
            pc_numero: 'PC 076 (RTDS)',
            num_reservas: Math.floor(totalReservas * 0.4),
            dias_totais: Math.floor(totalDias * 0.4)
        },
        periodo,
        dataInicio: dataInicio.toISOString().split('T')[0]
    };
}
