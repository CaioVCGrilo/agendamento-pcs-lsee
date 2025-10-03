import { NextResponse } from 'next/server';
import postgres from 'postgres';

// Cria a conexão com o banco de dados
const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' });

// Rota POST para criar um novo agendamento
export async function POST(request) {
    try {
        // Desestrutura o body da requisição (os nomes vêm do formulário: dataInicial, etc.)
        const { dataInicial, diasNecessarios, pc, nome, pin } = await request.json();

        if (!dataInicial || !diasNecessarios || !pc || !nome || !pin) {
            return NextResponse.json({ error: 'Dados incompletos. Todos os campos são obrigatórios.' }, { status: 400 });
        }

        // Insere o novo agendamento no banco de dados
        // Importante: Aqui usamos os nomes das COLUNAS do banco de dados (snake_case)
        // e os valores das variáveis JavaScript (camelCase)
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

        // Retorna o agendamento criado (primeiro item do array de resultados)
        return NextResponse.json({
            message: 'Agendamento criado com sucesso!',
            agendamento: result[0]
        }, { status: 201 });

    } catch (error) {
        console.error('Erro ao processar agendamento (POST):', error);
        // Retorna erro 500 com detalhes (evitar expor erros internos de DB em produção)
        return NextResponse.json({ error: 'Erro interno ao tentar salvar o agendamento.' }, { status: 500 });
    }
}

// Rota GET para buscar todos os agendamentos
export async function GET() {
    try {
        // Seleciona todos os agendamentos, ordenados pela data de início
        const agendamentos = await sql`
            SELECT id, data_inicio, dias_necessarios, pc_numero, agendado_por, pin
            FROM agendamentos
            ORDER BY data_inicio DESC;
        `;

        // Retorna a lista de agendamentos
        return NextResponse.json(agendamentos, { status: 200 });

    } catch (error) {
        console.error('Erro ao buscar agendamentos (GET):', error);
        // Retorna erro 500
        return NextResponse.json({ error: 'Erro interno ao carregar a lista de agendamentos.' }, { status: 500 });
    }
}
