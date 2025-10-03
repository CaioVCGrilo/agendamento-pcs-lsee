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

// Função de inicialização para criar a tabela se ela ainda não existir
async function initializeDatabase() {
    console.log("Tentando inicializar o banco de dados e criar a tabela 'agendamentos'...");

    // Query para criar a tabela com o comando IF NOT EXISTS
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

// Lista de todos os PCs disponíveis no laboratório
const TODOS_PCS = ['PC 094', 'PC 095', 'PC 083', 'PC 084', 'PC 085'];

// Rota GET para buscar PCs disponíveis (NOVA ROTA)
export async function GET_DISPONIVEIS(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        const { searchParams } = new URL(request.url);
        const dataInicio = searchParams.get('dataInicial');
        const diasNecessarios = parseInt(searchParams.get('diasNecessarios'), 10);

        if (!dataInicio || !diasNecessarios || diasNecessarios < 1) {
            // Retorna todos os PCs se os parâmetros estiverem incompletos/inválidos
            return NextResponse.json(TODOS_PCS, { status: 200 });
        }

        // 1. Calcula a data de fim para a consulta
        const dataFimReserva = new Date(dataInicio);
        dataFimReserva.setDate(dataFimReserva.getDate() + diasNecessarios - 1);
        const dataFimISO = dataFimReserva.toISOString().split('T')[0];

        // 2. Consulta: Encontra todos os PCs OCUPADOS no período
        const occupiedQuery = `
            SELECT DISTINCT pc_numero
            FROM agendamentos
            WHERE NOT (
                data_inicio > ? OR DATE_ADD(data_inicio, INTERVAL dias_necessarios - 1 DAY) < ?
            );
        `;

        const [occupiedResult] = await pool.execute(occupiedQuery, [dataFimISO, dataInicio]);

        // 3. Filtra os PCs disponíveis
        const occupiedPcs = occupiedResult.map(row => row.pc_numero);
        const availablePcs = TODOS_PCS.filter(pc => !occupiedPcs.includes(pc));

        return NextResponse.json(availablePcs, { status: 200 });

    } catch (error) {
        console.error('Erro ao buscar PCs disponíveis (GET_DISPONIVEIS):', error);
        return NextResponse.json({ error: 'Erro ao verificar disponibilidade.' }, { status: 503 });
    }
}

// Rota POST para criar um novo agendamento com VERIFICAÇÃO DE CONFLITO
export async function POST(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        const { dataInicial, diasNecessarios, pc, nome, pin } = await request.json();

        const dataInicio = dataInicial;
        const dias = parseInt(diasNecessarios, 10);

        if (!dataInicio || !dias || !pc || !nome || !pin) {
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

        const hashedPin = crypto.createHash('md5').update(pin).digest('hex');

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

// Rota GET para buscar todos os agendamentos (PIN NÃO é retornado)
export async function GET_ALL_AGENDAMENTOS() {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        const [agendamentos] = await pool.execute(
            `SELECT id, DATE_FORMAT(data_inicio, '%Y-%m-%d') AS data_inicio, dias_necessarios, pc_numero, agendado_por
             FROM agendamentos 
             ORDER BY data_inicio DESC;`
        );

        return NextResponse.json(agendamentos, { status: 200 });

    } catch (error) {
        console.error('Erro ao buscar agendamentos (GET):', error);
        return NextResponse.json({ error: 'Erro de infraestrutura ao carregar a lista de agendamentos.' }, { status: 503 });
    }
}

// Rota DELETE para cancelar um agendamento com verificação de PIN
export async function DELETE(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const { pinDigitado } = await request.json();

        if (!id || !pinDigitado) {
            return NextResponse.json({ error: 'ID e PIN de liberação são obrigatórios.' }, { status: 400 });
        }

        const hashedPinDigitado = crypto.createHash('md5').update(pinDigitado).digest('hex');

        const [deleteResult] = await pool.execute(
            'DELETE FROM agendamentos WHERE id = ? AND pin = ?',
            [id, hashedPinDigitado]
        );

        if (deleteResult.affectedRows === 0) {
            return NextResponse.json({ error: 'PIN ou ID do agendamento incorreto. Cancelamento não autorizado.' }, { status: 403 });
        }

        return NextResponse.json({ message: 'Agendamento cancelado com sucesso.' }, { status: 200 });

    } catch (error) {
        console.error('Erro ao processar cancelamento (DELETE):', error);
        return NextResponse.json({ error: 'Erro de infraestrutura ao cancelar o agendamento.' }, { status: 503 });
    }
}

// Adiciona um roteador para a rota GET
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    if (searchParams.has('dataInicial') && searchParams.has('diasNecessarios')) {
        return GET_DISPONIVEIS(request);
    }
    return GET_ALL_AGENDAMENTOS();
}