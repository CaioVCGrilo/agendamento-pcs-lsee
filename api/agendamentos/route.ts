// src/app/api/agendamentos/route.ts
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// Rota POST para adicionar um novo agendamento
export async function POST(request: Request) {
    try {
        const { dataInicial, diasNecessarios, pc, nome, pin } = await request.json();

        if (!dataInicial || !diasNecessarios || !pc || !nome || !pin) {
            return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
        }

        // Insere os dados no banco de dados.
        await sql`
      INSERT INTO agendamentos (data_inicio, dias_necessarios, pc_numero, agendado_por, pin)
      VALUES (${dataInicial}, ${diasNecessarios}, ${pc}, ${nome}, ${pin});
    `;

        return NextResponse.json({ message: 'Agendamento criado com sucesso!' }, { status: 201 });
    } catch (error) {
        console.error('Erro ao processar agendamento:', error);
        return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 });
    }
}

// Rota GET para buscar todos os agendamentos
export async function GET() {
    try {
        const { rows } = await sql`SELECT * FROM agendamentos ORDER BY data_inicio DESC, id DESC;`;
        return NextResponse.json(rows, { status: 200 });
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
    }
}