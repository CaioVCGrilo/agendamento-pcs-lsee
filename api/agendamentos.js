import { NextResponse } from 'next/server';
// Usando a biblioteca oficial do Vercel, que é mais robusta para serverless
import { sql } from '@vercel/postgres';


// Função auxiliar para verificar a conexão (simplificada, pois o @vercel/postgres trata a conexão por requisição)
function checkDbConnection() {
    // Com @vercel/postgres, a falha de conexão será capturada no bloco try/catch da consulta SQL
    return null;
}

// Rota POST para criar um novo agendamento
export async function POST(request) {
    try {
        const { dataInicial, diasNecessarios, pc, nome, pin } = await request.json();

        if (!dataInicial || !diasNecessarios || !pc || !nome || !pin) {
            return NextResponse.json({ error: 'Dados incompletos. Todos os campos são obrigatórios.' }, { status: 400 });
        }

        // A função 'sql' do @vercel/postgres é chamada aqui e usará a POSTGRES_URL
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
            agendamento: result.rows[0] // Alterado para acessar 'rows'
        }, { status: 201 });

    } catch (error) {
        // Este catch agora captura erros de conexão E de consulta SQL.
        console.error('Erro ao processar agendamento (POST):', error);

        // Retornamos 503 se o erro for de conexão, ou 500 para erro de consulta.
        // O erro exato aparecerá nos logs da Vercel.
        return NextResponse.json({ error: 'Serviço indisponível ou erro de consulta ao banco de dados.' }, { status: 503 });
    }
}

// Rota GET para buscar todos os agendamentos
export async function GET() {
    try {
        // A função 'sql' do @vercel/postgres é chamada aqui e usará a POSTGRES_URL
        const agendamentos = await sql`
            SELECT id, data_inicio, dias_necessarios, pc_numero, agendado_por, pin 
            FROM agendamentos 
            ORDER BY data_inicio DESC;
        `;

        // Retorna a lista de agendamentos
        return NextResponse.json(agendamentos.rows, { status: 200 }); // Alterado para retornar 'rows'

    } catch (error) {
        console.error('Erro ao buscar agendamentos (GET):', error);
        return NextResponse.json({ error: 'Serviço indisponível ou erro de consulta ao banco de dados.' }, { status: 503 });
    }
}