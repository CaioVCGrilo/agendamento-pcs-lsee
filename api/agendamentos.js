import { NextResponse } from 'next/server';

// Rota POST para simular a criação de um agendamento
export async function POST(request) {
    try {
        // Acessamos o corpo da requisição (body)
        const body = await request.json();

        // Simplesmente retornamos uma resposta de sucesso sem usar o banco de dados
        return NextResponse.json({
            message: 'API respondeu com sucesso! (Teste JS OK)',
            data: body // Retorna os dados para confirmar que a rota foi alcançada
        }, { status: 201 });

    } catch (error) {
        // Este bloco será executado se o JSON da requisição for inválido ou se houver um erro de rota
        console.error('Erro ao processar agendamento:', error);
        return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
    }
}

// Rota GET temporária (necessária para testes no navegador)
export async function GET() {
    return NextResponse.json({ status: "API OK", endpoint: "/api/agendamentos" }, { status: 200 });
}