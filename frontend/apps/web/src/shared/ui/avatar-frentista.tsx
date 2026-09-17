/**
 * Avatar de um frentista: a foto que ele mesmo pôs no PWA, ou as iniciais.
 *
 * @remarks Substitui a chamada a `ui-avatars.com` que o painel fazia. Aquilo
 *          mandava o NOME dos funcionários para um serviço de terceiros a cada
 *          carregamento e deixava a tela dependente de internet para desenhar um
 *          círculo colorido. As iniciais agora são desenhadas aqui — de graça,
 *          offline e sem contar a ninguém quem trabalha no posto.
 * @remarks Também substitui `/avatars/{id}.jpg`, um caminho que nunca existiu:
 *          a pasta não está no repositório, então aquelas imagens davam 404.
 */

interface Props {
    readonly nome: string;
    /** Data URL vinda de `Frentista.foto`. Vazio ou nulo cai nas iniciais. */
    readonly foto?: string | null;
    /** Lado em pixels. O texto acompanha, senão a inicial some num círculo grande. */
    readonly tamanho?: number;
    /** Classes extras — a borda de destaque de cada tela entra por aqui. */
    readonly className?: string;
}

/** "João Carlos Silva" → "JS"; "Ana" → "AN". */
function iniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();

    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

export function AvatarFrentista({ nome, foto, tamanho = 40, className = '' }: Props) {
    const medida = { width: tamanho, height: tamanho };

    if (foto) {
        return (
            <img
                src={foto}
                alt={`Foto de ${nome}`}
                style={medida}
                className={`rounded-full object-cover ${className}`}
            />
        );
    }

    return (
        <div
            style={medida}
            className={`rounded-full flex items-center justify-center font-bold bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 ${className}`}
            aria-label={`Sem foto: ${nome}`}
        >
            <span style={{ fontSize: Math.round(tamanho * 0.36) }}>{iniciais(nome)}</span>
        </div>
    );
}

export default AvatarFrentista;
