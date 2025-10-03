// src/app/api/agendamentos/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Temporariamente, apenas retorne uma resposta de sucesso
        return NextResponse.json({ message: 'API respondeu com sucesso!' }, { status: 201 });
    } catch (error) {
        console.error('Erro ao processar agendamento:', error);
        return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
    }
}