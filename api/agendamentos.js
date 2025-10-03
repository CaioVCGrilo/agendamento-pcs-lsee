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
    // NOTA: O campo PIN VARCHAR(10) deve ser VARCHAR(32) para armazenar o hash MD5 completo.
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

// Rota POST para criar um novo agendamento
export async function POST(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        // Recebe os dados do formulário
        const { dataInicial, diasNecessarios, pc, nome, pin } = await request.json();

        if (!dataInicial || !diasNecessarios || !pc || !nome || !pin) {
            return NextResponse.json({ error: 'Dados incompletos. Todos os campos são obrigatórios.' }, { status: 400 });
        }

        // CRIPTOGRAFIA: Salva o PIN como hash MD5
        const hashedPin = crypto.createHash('md5').update(pin).digest('hex');

        // Consulta SQL para INSERIR dados no MySQL
        const query = `
            INSERT INTO agendamentos (
                data_inicio, 
                dias_necessarios, 
                pc_numero, 
                agendado_por, 
                pin
            ) VALUES (?, ?, ?, ?, ?);
        `;

        // Insere o PIN criptografado
        const [result] = await pool.execute(query, [dataInicial, diasNecessarios, pc, nome, hashedPin]);

        // Retorna o status de sucesso
        return NextResponse.json({
            message: 'Agendamento criado com sucesso!',
            id: result.insertId // Retorna o ID do novo registro
        }, { status: 201 });

    } catch (error) {
        console.error('Erro ao processar agendamento (POST):', error);
        // Em caso de erro de DB, retorna 503 Service Unavailable
        return NextResponse.json({ error: 'Erro de infraestrutura ao salvar o agendamento.' }, { status: 503 });
    }
}

// Rota GET para buscar todos os agendamentos (PIN NÃO é retornado)
export async function GET() {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        // Consulta SQL: Note que a coluna 'pin' foi removida da seleção para segurança
        const [agendamentos] = await pool.execute(
            `SELECT id, DATE_FORMAT(data_inicio, '%Y-%m-%d') AS data_inicio, dias_necessarios, pc_numero, agendado_por
             FROM agendamentos
             ORDER BY data_inicio DESC;`
        );

        // O resultado da consulta MySQL é um array de objetos, que é retornado diretamente
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
        // Recebe os parâmetros da URL (id) e o corpo da requisição (pin)
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const { pinDigitado } = await request.json();

        if (!id || !pinDigitado) {
            return NextResponse.json({ error: 'ID e PIN de liberação são obrigatórios.' }, { status: 400 });
        }

        // CRIPTOGRAFIA: Criptografa o PIN digitado para comparação
        const hashedPinDigitado = crypto.createHash('md5').update(pinDigitado).digest('hex');

        // 1. Verifica se o PIN CRIPTOGRAFADO corresponde ao agendamento
        const [deleteResult] = await pool.execute(
            'DELETE FROM agendamentos WHERE id = ? AND pin = ?',
            [id, hashedPinDigitado]
        );

        if (deleteResult.affectedRows === 0) {
            // Se nenhuma linha foi afetada, significa que o ID não existe OU o PIN estava incorreto
            // Retornamos 403 (Proibido) para PIN incorreto ou 404 (Não Encontrado) para ID
            // Aqui, retornamos uma mensagem genérica de erro de autenticação para segurança
            return NextResponse.json({ error: 'PIN ou ID do agendamento incorreto. Cancelamento não autorizado.' }, { status: 403 });
        }

        return NextResponse.json({ message: 'Agendamento cancelado com sucesso.' }, { status: 200 });

    } catch (error) {
        console.error('Erro ao processar cancelamento (DELETE):', error);
        return NextResponse.json({ error: 'Erro de infraestrutura ao cancelar o agendamento.' }, { status: 503 });
    }
}
