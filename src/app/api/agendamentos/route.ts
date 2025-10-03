import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log(body); // Verifica se os dados do formulário estão chegando
        // Apenas retorne uma resposta de sucesso sem tocar no banco de dados.
        return NextResponse.json({ message: 'Conexão OK!' }, { status: 201 });
    } catch (error) {
        console.error('Erro ao processar agendamento:', error);
        return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
    }
}