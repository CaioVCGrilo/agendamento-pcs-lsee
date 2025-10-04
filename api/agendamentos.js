import { NextResponse } from 'next/server';
// Importa a biblioteca mysql2 e a função 'createPool' para gerenciar conexões.
import mysql from 'mysql2/promise';
// Importa o módulo nativo 'crypto' para criptografia de senhas (MD5)
const crypto = require('crypto');

// Configuração do pool de conexões com variáveis de ambiente
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Adicione esta opção se estiver usando um provedor como PlanetScale (conexão SSL)
    // ssl: { rejectUnauthorized: true },
});

// IP de exceção definido como constante para fácil manutenção
const LSEE_EXCEPTION_IP = '143.107.235.10';

// Função para auto-excluir agendamentos passados
async function autoDeleteOldReservations() {
    console.log("Executando limpeza de agendamentos antigos...");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split('T')[0];

    const deleteQuery = `
        DELETE FROM agendamentos
        WHERE DATE_ADD(data_inicio, INTERVAL dias_necessarios DAY) <= ?;
    `;

    try {
        const [result] = await pool.execute(deleteQuery, [yesterdayISO]);
        console.log(`Limpeza concluída. ${result.affectedRows} agendamento(s) antigo(s) excluído(s).`);
    } catch (error) {
        console.error("ERRO: Falha ao executar a limpeza de agendamentos antigos.", error);
    }
}

// Função de inicialização para criar a tabela se ela ainda não existir
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
    `;

    try {
        await pool.execute(createTableQuery);
        console.log("Tabela 'agendamentos' verificada/criada com sucesso.");
    } catch (error) {
        console.error("ERRO CRÍTICO: Falha ao inicializar a tabela agendamentos.", error);
    }
}

// Chama a função de inicialização assim que o script é carregado
initializeDatabase();
autoDeleteOldReservations();

// Função auxiliar para verificar a conexão (simplificada)
function checkDbConnection() {
    if (!process.env.MYSQL_HOST) {
        return NextResponse.json(
            { error: 'Serviço indisponível. Variáveis de ambiente do MySQL não configuradas.' },
            { status: 503 }
        );
    }
    return null;
}

// Lista de todos os PCs disponíveis no laboratório (MESMA LISTA DO FRONTEND)
const TODOS_PCS = ['PC 082', 'PC 083', 'PC 094', 'PC 095'];

// Rota GET para buscar PCs disponíveis (CORREÇÃO DE LÓGICA)
export async function GET_DISPONIVEIS(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        const { searchParams } = new URL(request.url);
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
            WHERE NOT (
                data_inicio > ? OR DATE_ADD(data_inicio, INTERVAL dias_necessarios - 1 DAY) < ?
                );
        `;

        const [occupiedResult] = await pool.execute(occupiedQuery, [dataFimISO, dataInicio]);

        const occupiedPcs = occupiedResult.map(row => row.pc_numero);
        const availablePcs = TODOS_PCS.filter(pc => !occupiedPcs.includes(pc));

        return NextResponse.json(availablePcs, { status: 200 });

    } catch (error) {
        console.error('Erro ao buscar PCs disponíveis (GET_DISPONIVEIS):', error);
        return NextResponse.json({ error: 'Erro ao verificar disponibilidade. Cheque a conexão com o DB.' }, { status: 503 });
    }
}

export async function POST(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        const { dataInicial, diasNecessarios, pc, nome, pin, codigo_lsee } = await request.json();

        // Obtém o endereço IP do cliente a partir dos cabeçalhos da requisição
        const clientIP = request.headers.get('x-forwarded-for') || request.ip;

        // Define o código LSEE a ser verificado
        const lseeCode = process.env.LSEE_CODE;
        let isPinRequired = true;

        if (clientIP === LSEE_EXCEPTION_IP) {
            console.log(`Reserva via IP autorizado (${clientIP}). O PIN não será validado.`);
            isPinRequired = false;
        } else {
            if (!lseeCode || codigo_lsee !== lseeCode) {
                return NextResponse.json(
                    { error: 'Código LSEE incorreto. Acesso não autorizado.' },
                    { status: 401 }
                );
            }
            console.log(`Código LSEE validado com sucesso. Prosseguindo com a reserva.`);
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
            AND NOT (
                data_inicio > ? OR DATE_ADD(data_inicio, INTERVAL dias_necessarios - 1 DAY) < ?
            )
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
            // Se o PIN não for necessário, armazena um hash fixo.
            hashedPin = '00000000000000000000000000000000';
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
            id: result.insertId
        }, { status: 201 });

    } catch (error) {
        console.error('Erro ao processar agendamento (POST):', error);
        return NextResponse.json({ error: 'Erro de infraestrutura ao salvar o agendamento.' }, { status: 503 });
    }
}

export async function GET_ALL_AGENDAMENTOS() {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        // Obtém a data de hoje, formatada para o padrão do banco de dados (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];

        const [agendamentos] = await pool.execute(
            `SELECT 
                id, 
                DATE_FORMAT(data_inicio, '%Y-%m-%d') AS data_inicio, 
                dias_necessarios, 
                pc_numero, 
                agendado_por
            FROM agendamentos
            WHERE DATE_ADD(data_inicio, INTERVAL dias_necessarios - 1 DAY) >= ?
            ORDER BY data_inicio ASC;`,
            [today]
        );

        return NextResponse.json(agendamentos, { status: 200 });

    } catch (error) {
        console.error('Erro ao buscar agendamentos (GET):', error);
        return NextResponse.json({ error: 'Erro de infraestrutura ao carregar a lista de agendamentos.' }, { status: 503 });
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

        if (clientIP === LSEE_EXCEPTION_IP) {
            // Se a requisição vem do IP autorizado, o PIN não é necessário.
            console.log(`Cancelamento via IP autorizado (${clientIP}). O PIN não será validado.`);
            deleteQuery = 'DELETE FROM agendamentos WHERE id = ?';
            queryParams = [id];
        } else {
            // Caso contrário, o PIN é obrigatório para o cancelamento.
            if (!id || !pinDigitado) {
                return NextResponse.json({ error: 'ID e PIN de liberação são obrigatórios.' }, { status: 400 });
            }
            const hashedPinDigitado = crypto.createHash('md5').update(pinDigitado).digest('hex');
            deleteQuery = 'DELETE FROM agendamentos WHERE id = ? AND pin = ?';
            queryParams = [id, hashedPinDigitado];
        }

        const [deleteResult] = await pool.execute(deleteQuery, queryParams);

        if (deleteResult.affectedRows === 0) {
            return NextResponse.json({ error: 'PIN ou ID do agendamento incorreto. Cancelamento não autorizado.' }, { status: 403 });
        }

        return NextResponse.json({ message: 'Agendamento cancelado com sucesso.' }, { status: 200 });

    } catch (error) {
        console.error('Erro ao processar cancelamento (DELETE):', error);
        return NextResponse.json({ error: 'Erro de infraestrutura ao cancelar o agendamento.' }, { status: 503 });
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    if (searchParams.has('dataInicial') && searchParams.has('diasNecessarios')) {
        return GET_DISPONIVEIS(request);
    }
    return GET_ALL_AGENDAMENTOS();
}