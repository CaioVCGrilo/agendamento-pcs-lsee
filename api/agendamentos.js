import { NextResponse } from 'next/server';
import postgres from 'postgres';

// Variável para armazenar o objeto de conexão do PostgreSQL
let sql;

// Bloco de inicialização para criar a conexão uma única vez
try {
    // Garante que o SSL seja ativado, necessário para ambientes serverless (Vercel/Neon)
    sql = postgres(process.env.POSTGRES_URL, {
        ssl: { rejectUnauthorized: false } // Configuração de SSL robusta
    });
} catch (error) {
    console.error('ERRO CRÍTICO DE CONEXÃO COM O BD:', error);
    // Em caso de falha na inicialização, a variável 'sql' permanecerá indefinida/inutilizável.
    // O erro será tratado em cada rota abaixo.
    sql = null;
}


// Função auxiliar para verificar a conexão e retornar um erro 503 se o BD estiver indisponível
function checkDbConnection() {
    if (!sql) {
        return NextResponse.json(
            { error: 'Serviço indisponível. Falha na conexão com o banco de dados.' },
            { status: 503 } // 503 Service Unavailable: Mais adequado que o 500
        );
    }
    return null; // Conexão OK
}

// Rota POST para criar um novo agendamento
export async function POST(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError; // Retorna 503 se a conexão falhou

    try {
        const { dataInicial, diasNecessarios, pc, nome, pin } = await request.json();

        if (!dataInicial || !diasNecessarios || !pc || !nome || !pin) {
            return NextResponse.json({ error: 'Dados incompletos. Todos os campos são obrigatórios.' }, { status: 400 });
        }

        const result = await sql`
            INSERT INTO agendamentos (
                data_inicio, 
                dias_necessarios, 
                pc_numero, 
                agendado_por, 
                pin
            ) VALUES (
                ${dataInicial}, 
                ${diasNecessarios}, 
                ${pc}, 
                ${nome}, 
                ${pin}
            ) RETURNING *;
        `;

        return NextResponse.json({
            message: 'Agendamento criado com sucesso!',
            agendamento: result[0]
        }, { status: 201 });

    } catch (error) {
        // Captura erros de consulta SQL, mas não a falha de conexão inicial
        console.error('Erro ao processar agendamento (POST):', error);
        return NextResponse.json({ error: 'Erro de consulta ao banco de dados. Tente novamente mais tarde.' }, { status: 500 });
    }
}

// Rota GET para buscar todos os agendamentos
export async function GET() {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError; // Retorna 503 se a conexão falhou

    try {
        const agendamentos = await sql`
            SELECT id, data_inicio, dias_necessarios, pc_numero, agendado_por, pin
            FROM agendamentos
            ORDER BY data_inicio DESC;
        `;

        return NextResponse.json(agendamentos, { status: 200 });

    } catch (error) {
        console.error('Erro ao buscar agendamentos (GET):', error);
        return NextResponse.json({ error: 'Erro de consulta ao banco de dados. Tente novamente mais tarde.' }, { status: 500 });
    }
}
