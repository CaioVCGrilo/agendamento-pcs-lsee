import { NextResponse } from 'next/server';
// Importa a biblioteca mysql2 e a função 'createPool' para gerenciar conexões.
import mysql from 'mysql2/promise';

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
            pin VARCHAR(10) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        await pool.execute(createTableQuery);
        console.log("Tabela 'agendamentos' verificada/criada com sucesso.");
    } catch (error) {
        console.error("ERRO CRÍTICO: Falha ao inicializar a tabela agendamentos.", error);
        // Em um ambiente Vercel, este erro de inicialização pode ser a causa do FUNCTION_INVOCATION_FAILED.
        // É crucial que as variáveis de ambiente e o banco de dados estejam acessíveis aqui.
    }
}

// Chama a função de inicialização assim que o script é carregado
// Isso garante que a tabela exista antes que qualquer rota tente acessá-la.
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

        // O método pool.execute usa placeholders (?) que são mais seguros (Prepared Statements)
        const [result] = await pool.execute(query, [dataInicial, diasNecessarios, pc, nome, pin]);

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

// Rota GET para buscar todos os agendamentos
export async function GET() {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        // Consulta SQL para buscar dados no MySQL
        const [agendamentos] = await pool.execute(
            `SELECT id, DATE_FORMAT(data_inicio, '%Y-%m-%d') AS data_inicio, dias_necessarios, pc_numero, agendado_por, pin 
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