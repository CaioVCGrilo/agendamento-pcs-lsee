import os
import sys

def consolidate_project_files():
    """
    Percorre o diretório atual (onde o terminal está aberto), encontra arquivos de código
    com extensões específicas e consolida seu conteúdo em um único arquivo de texto,
    ignorando subpastas comuns de desenvolvimento.
    """
    # Define o diretório de trabalho como o diretório atual do terminal.
    directory_path = os.getcwd()
    print(f"Analisando o diretório: {directory_path}")

    # Nome do arquivo de saída que será criado no mesmo diretório.
    output_file_name = "conteudo_consolidado.txt"
    output_file_path = os.path.join(directory_path, output_file_name)

    # Lista de extensões de arquivo a serem processadas.
    extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.html']

    # Lista de subpastas a serem ignoradas.
    ignored_subfolders = ['.git', '__pycache__', 'venv', 'node_modules', 'dist', 'build']

    try:
        with open(output_file_path, 'w', encoding='utf-8') as outfile:
            # os.walk percorre a árvore de diretórios.
            for root, dirs, files in os.walk(directory_path):
                # Remove as pastas ignoradas para que não sejam analisadas.
                dirs[:] = [d for d in dirs if d not in ignored_subfolders]

                for file_name in files:
                    # Verifica se o arquivo tem uma das extensões desejadas.
                    if any(file_name.endswith(ext) for ext in extensions):
                        file_path = os.path.join(root, file_name)

                        # Ignora o próprio script e o arquivo de saída para não incluí-los.
                        if os.path.abspath(file_path) == os.path.abspath(sys.argv[0]) or \
                           os.path.abspath(file_path) == os.path.abspath(output_file_path):
                            continue

                        print(f"Processando: {file_path}")
                        try:
                            # Escreve um cabeçalho para cada arquivo no arquivo de saída.
                            relative_path = os.path.relpath(file_path, directory_path)
                            outfile.write("=" * 80 + "\n")
                            outfile.write(f"Caminho do arquivo: {relative_path}\n")
                            outfile.write("=" * 80 + "\n\n")

                            # Lê o conteúdo do arquivo e o escreve no arquivo de saída.
                            # 'errors='ignore'' evita problemas com arquivos de codificação diferente.
                            with open(file_path, 'r', encoding='utf-8', errors='ignore') as infile:
                                content = infile.read()
                                outfile.write(content + "\n\n")

                        except Exception as e:
                            print(f"Erro ao processar o arquivo {file_path}: {e}")

        print(f"\nConcluído! O conteúdo foi salvo em '{output_file_path}'.")

    except Exception as e:
        print(f"Ocorreu um erro inesperado: {e}")

if __name__ == "__main__":
    """
    Este bloco é o ponto de entrada do script. Quando você executa `python consolidar_arquivos.py`
    no terminal, a função consolidate_project_files() é chamada.
    """
    consolidate_project_files()
