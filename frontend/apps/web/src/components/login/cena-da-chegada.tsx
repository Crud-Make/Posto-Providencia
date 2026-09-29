import React from 'react';

/**
 * O fundo da tela de entrada (com `noite`, a mesma chegada depois do pôr do sol — o modo escuro): a chegada a Caldas do Jorro ao entardecer — o pórtico novo ("Bem-vindo
 * ao Oásis do Sertão"), a estrada passando por ele e, à esquerda, o Posto BR com a estradinha até a
 * pista (desenho aprovado pelo dono em 28/09/2026, a partir das fotos da entrada e do posto).
 *
 * @remarks Desenho, não foto: as fotos da entrada têm ~400 px e borrariam em tela cheia. `slice` cobre
 *          qualquer proporção de tela ancorada no chão (`YMax`); o céu, a terra e a caatinga se estendem 480
 *          unidades para cada lado, para tela larga cortar os lados e não o alto do pórtico. Decorativo,
 *          fora da árvore acessível. O letreiro usa a Pacifico (carregada no `index.html`).
 */
const DIA = {
  ceu: ['#6F86C4', '#B3A6D0', '#E9BFC0', '#F6CFA6'], nuvem: 0.55, serra: '#9C98B8', caatinga: '#4E6A44', mandacaru: '#3F5838',
  terra: '#C98A5A', terraBorda: '#B77A4C', estrada: ['#5A5B66', '#2E3038'], calcada: '#D9D3C8', portico: '#2A9C98', patio: '#BDB7AE', luz: 0,
  folha: ['#4E6A44', '#62824F', '#3F5838'], tronco: '#6B4A33', bloco: '#CFC4B2', junta: '#9E9384',
  casas: ['#EAD9B0', '#D98C6A', '#9CC0C9', '#F2EDE4', '#C9A6C7'], telhado: '#A5553A', janela: '#5C6B85', lanterna: 0,
};
const NOITE = {
  ceu: ['#050A1E', '#101A4A', '#3A2A5C', '#8C4A3C'], nuvem: 0.12, serra: '#262A4A', caatinga: '#1A2A22', mandacaru: '#132019',
  terra: '#5E3F2C', terraBorda: '#4E3424', estrada: ['#2A2C36', '#15161C'], calcada: '#8C877E', portico: '#1E7C79', patio: '#77726B', luz: 1,
  folha: ['#1A2A22', '#22342A', '#132019'], tronco: '#3A2A20', bloco: '#6F695F', junta: '#4F4A42',
  casas: ['#3A3550', '#43344A', '#2F3A52', '#3D3A4E', '#3E3350'], telhado: '#2A1E26', janela: '#FFD27A', lanterna: 1,
};

/** Casas da cidadezinha no fim da estrada (a igrejinha saiu a pedido do dono, 28/09/2026): [x, largura, altura, índice da cor]. */
const CASAS: ReadonlyArray<readonly [number, number, number, number]> = [
  [828, 18, 12, 0], [848, 14, 16, 1], [864, 20, 11, 2], [886, 16, 14, 4], [906, 24, 15, 3],
  [936, 18, 13, 1], [956, 14, 17, 0], [972, 20, 12, 2], [994, 16, 15, 3], [1012, 18, 11, 4],
];

const CenaDaChegada: React.FC<{ className?: string; noite?: boolean }> = ({ className = '', noite = false }) => {
  const c = noite ? NOITE : DIA;
  return (
  <svg aria-hidden="true" focusable="false" viewBox="-480 0 2400 900" preserveAspectRatio="xMidYMax slice" className={className}>
    <defs>
      <linearGradient id="cena-entardecer" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={c.ceu[0]} />
        <stop offset="0.45" stopColor={c.ceu[1]} />
        <stop offset="0.78" stopColor={c.ceu[2]} />
        <stop offset="1" stopColor={c.ceu[3]} />
      </linearGradient>
      <linearGradient id="cena-estrada" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={c.estrada[0]} />
        <stop offset="1" stopColor={c.estrada[1]} />
      </linearGradient>
      <pattern id="cena-calcamento" width="22" height="12" patternUnits="userSpaceOnUse">
        <rect width="22" height="12" fill={c.junta} />
        <rect x="1" y="1" width="20" height="4.5" rx="1" fill={c.bloco} />
        <rect x="-10" y="6.5" width="20" height="4.5" rx="1" fill={c.bloco} />
        <rect x="12" y="6.5" width="20" height="4.5" rx="1" fill={c.bloco} />
      </pattern>
      <radialGradient id="cena-brilho" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#FFF4CF" stopOpacity="0.9" />
        <stop offset="1" stopColor="#FFF4CF" stopOpacity="0" />
      </radialGradient>
    </defs>

    <rect x="-480" y="0" width="2400" height="620" fill="url(#cena-entardecer)" />
    {noite && (
      <g fill="#FFFFFF">
        {[[180, 90], [420, 60], [610, 140], [880, 80], [1060, 130], [1250, 70], [1380, 190], [300, 220], [760, 210], [1150, 250]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" opacity="0.8" />
        ))}
      </g>
    )}
    <g fill="#FFFFFF" opacity={c.nuvem}>
      <ellipse cx="300" cy="120" rx="170" ry="34" />
      <ellipse cx="400" cy="100" rx="110" ry="30" />
      <ellipse cx="1180" cy="170" rx="200" ry="30" />
      <ellipse cx="1300" cy="150" rx="120" ry="28" />
    </g>
    <g fill="#FFFFFF" opacity={c.nuvem * 0.55}>
      <ellipse cx="760" cy="470" rx="260" ry="12" />
      <ellipse cx="1300" cy="500" rx="180" ry="10" />
    </g>

    {/* serra, caatinga e mandacarus */}
    <path d="M-480 590 L-340 570 L-200 582 L-80 566 L0 596 L120 572 L260 584 L420 560 L560 578 L700 566 L860 582 L1000 570 L1160 586 L1300 568 L1440 580 L1580 566 L1720 584 L1920 572 L1920 620 L-480 620 Z" fill={c.serra} />
    <path d="M-480 612 Q-440 596 -400 608 Q-360 592 -320 606 Q-280 598 -240 610 Q-200 594 -160 606 Q-120 596 -80 610 Q-40 594 0 612 Q30 594 60 606 Q80 590 110 604 Q140 588 170 606 Q200 596 230 608 Q270 590 300 606 Q330 598 360 610 Q400 592 430 606 Q470 596 500 610 Q540 594 570 608 Q610 598 640 610 L700 612 L700 628 L-480 628 Z" fill={c.caatinga} />
    <path d="M1240 612 Q1270 596 1300 608 Q1330 592 1360 606 Q1400 596 1440 608 Q1500 594 1560 608 Q1620 596 1680 610 Q1740 592 1800 606 Q1860 598 1920 610 L1920 628 L1240 628 Z" fill={c.caatinga} />
    <g stroke={c.mandacaru} strokeLinecap="round" fill="none">
      <path d="M40 606 L40 570 M40 584 L28 584 L28 574 M40 590 L52 590 L52 578" strokeWidth="7" />
      <path d="M1340 604 L1340 560 M1340 576 L1326 576 L1326 564 M1340 584 L1354 584 L1354 570" strokeWidth="8" />
    </g>

    {/* a cidadezinha no fim da estrada, só casas (em dobro, com a base no horizonte) */}
    <g transform="translate(918 616) scale(2) translate(-918 -616)">
      {CASAS.map(([x, w, h, cor]) => (
        <g key={x}>
          <rect x={x} y={616 - h} width={w} height={h} fill={c.casas[cor]} />
          <polygon points={`${x - 2},${616 - h} ${x + w / 2},${608 - h} ${x + w + 2},${616 - h}`} fill={c.telhado} />
          <rect x={x + w / 2 - 2} y={616 - h + 4} width="4" height="4" fill={c.janela} />
        </g>
      ))}
    </g>

    {/* terra vermelha */}
    <rect x="-480" y="620" width="2400" height="280" fill={c.terra} />
    <rect x="-480" y="620" width="2400" height="10" fill={c.terraBorda} />

    {/* a estrada e o pórtico de Caldas do Jorro */}
    <g transform="translate(-90 0)">
      <polygon points="980,616 1040,616 1600,900 440,900" fill="url(#cena-estrada)" />
      <line x1="984" y1="616" x2="470" y2="900" stroke="#EDEBE4" strokeWidth="5" />
      <line x1="1036" y1="616" x2="1570" y2="900" stroke="#EDEBE4" strokeWidth="5" />
      <line x1="1006" y1="616" x2="1004" y2="900" stroke="#E8C33A" strokeWidth="5" />
      <line x1="1014" y1="616" x2="1030" y2="900" stroke="#E8C33A" strokeWidth="5" />
      <polygon points="770,606 950,606 930,632 740,632" fill={c.calcada} />
      <polygon points="1070,606 1250,606 1280,632 1090,632" fill={c.calcada} />

      <rect x="800" y="330" width="58" height="282" fill={c.portico} />
      <rect x="1162" y="330" width="58" height="282" fill={c.portico} />
      <g fill="none" stroke="#14335A" strokeWidth="5" strokeLinecap="round">
        <path d="M814 350 Q826 420 814 480 Q804 540 816 606" />
        <path d="M830 350 Q842 430 832 500 Q824 560 836 606" />
        <path d="M846 350 Q852 410 846 470 Q840 540 848 606" />
        <path d="M1176 350 Q1188 420 1176 480 Q1166 540 1178 606" />
        <path d="M1192 350 Q1204 430 1194 500 Q1186 560 1198 606" />
        <path d="M1208 350 Q1214 410 1208 470 Q1202 540 1210 606" />
      </g>
      <g fill="#F4F1EA">
        <rect x="792" y="316" width="74" height="16" />
        <rect x="798" y="306" width="62" height="12" />
        <rect x="1154" y="316" width="74" height="16" />
        <rect x="1160" y="306" width="62" height="12" />
      </g>
      <rect x="780" y="226" width="460" height="84" rx="6" fill={c.portico} />
      <g fill="none" stroke="#14335A" strokeWidth="5" strokeLinecap="round">
        <path d="M800 290 Q830 240 880 262 Q920 280 900 250" />
        <path d="M1220 290 Q1190 240 1140 262 Q1100 280 1120 250" />
      </g>
      <text x="1010" y="272" textAnchor="middle" fontFamily="Pacifico, cursive" fontSize="44" fill="#FFFFFF" stroke="#14335A" strokeWidth="3" paintOrder="stroke">
        Caldas do Jorro
      </text>
      <text x="1010" y="296" textAnchor="middle" fontWeight="700" fontSize="13" letterSpacing="1.5" fill="#FFFFFF">
        BEM-VINDO AO OÁSIS DO SERTÃO
      </text>
    </g>


    {/* os carros do dono, indo para a cidade na mão direita: a S10 mais à frente, o Corolla branco 2015 mais perto */}
    <g transform="translate(962 646) scale(0.62)">
      <ellipse cx="50" cy="66" rx="58" ry="7" fill="#000000" opacity="0.28" />
      <rect x="10" y="0" width="80" height="30" rx="6" fill="#B8BDC4" />
      <rect x="16" y="5" width="68" height="16" rx="3" fill="#2B3440" />
      <rect x="2" y="26" width="96" height="30" rx="4" fill="#C3C8CE" />
      <rect x="2" y="26" width="96" height="6" fill="#A7ADB5" />
      <text x="50" y="45" textAnchor="middle" fontWeight="800" fontSize="9" fill="#5A616B">S10</text>
      <rect x="2" y="34" width="9" height="14" rx="2" fill="#C8202A" />
      <rect x="89" y="34" width="9" height="14" rx="2" fill="#C8202A" />
      <rect x="38" y="48" width="24" height="7" fill="#F4F4F2" stroke="#5A616B" strokeWidth="0.8" />
      <rect x="0" y="54" width="100" height="6" rx="2" fill="#4A4F57" />
      <rect x="4" y="58" width="16" height="10" rx="2" fill="#15161C" />
      <rect x="80" y="58" width="16" height="10" rx="2" fill="#15161C" />
      <g opacity={c.lanterna}>
        <circle cx="6" cy="41" r="12" fill="#FF3B30" opacity="0.35" />
        <circle cx="94" cy="41" r="12" fill="#FF3B30" opacity="0.35" />
      </g>
    </g>
    <g transform="translate(1030 752) scale(1.12)">
      <ellipse cx="60" cy="50" rx="66" ry="8" fill="#000000" opacity="0.3" />
      <path d="M26 16 Q30 2 44 1 L76 1 Q90 2 94 16 Z" fill="#F1F1EE" />
      <path d="M31 15 Q35 5 46 4 L74 4 Q85 5 89 15 Z" fill="#2B3440" />
      <rect x="4" y="15" width="112" height="28" rx="9" fill="#F4F4F1" />
      <rect x="4" y="15" width="112" height="4" rx="2" fill="#DCDCD8" />
      <path d="M8 22 L32 22 L30 30 L8 30 Z" fill="#B0161F" />
      <path d="M112 22 L88 22 L90 30 L112 30 Z" fill="#B0161F" />
      <rect x="32" y="24" width="56" height="4" rx="2" fill="#D8D8D4" />
      <rect x="47" y="31" width="26" height="8" fill="#F8F8F6" stroke="#5A616B" strokeWidth="0.8" />
      <rect x="2" y="38" width="116" height="7" rx="3" fill="#E4E4E0" />
      <rect x="8" y="42" width="16" height="9" rx="2" fill="#15161C" />
      <rect x="96" y="42" width="16" height="9" rx="2" fill="#15161C" />
      <g opacity={c.lanterna}>
        <circle cx="18" cy="26" r="16" fill="#FF3B30" opacity="0.35" />
        <circle cx="102" cy="26" r="16" fill="#FF3B30" opacity="0.35" />
      </g>
    </g>

    {/* vegetação do outro lado da estrada, em frente ao posto: duas árvores de copa larga e moitas */}
    <g transform="translate(1340 0)">
      <rect x="-86" y="612" width="12" height="82" fill={c.tronco} />
      <ellipse cx="-80" cy="604" rx="62" ry="34" fill={c.folha[0]} />
      <ellipse cx="-104" cy="588" rx="36" ry="24" fill={c.folha[1]} />
      <ellipse cx="-52" cy="592" rx="40" ry="26" fill={c.folha[1]} />
      <rect x="4" y="636" width="10" height="60" fill={c.tronco} />
      <ellipse cx="9" cy="628" rx="48" ry="28" fill={c.folha[0]} />
      <ellipse cx="-10" cy="616" rx="28" ry="18" fill={c.folha[1]} />
      <ellipse cx="28" cy="620" rx="30" ry="20" fill={c.folha[1]} />
      <ellipse cx="-150" cy="694" rx="52" ry="18" fill={c.folha[2]} />
      <ellipse cx="-36" cy="698" rx="44" ry="16" fill={c.folha[2]} />
      <ellipse cx="36" cy="700" rx="30" ry="12" fill={c.folha[0]} />
    </g>

    {/* a estradinha até o posto */}
    <polygon points="404,686 468,686 708,716 676,740" fill="#3A3C46" />
    <line x1="436" y1="687" x2="692" y2="728" stroke="#EDEBE4" strokeWidth="3" strokeDasharray="12 10" />

    {/* o Posto BR, na chegada */}
    <g transform="translate(-54 145) scale(0.78)">
      <polygon points="150,648 700,644 740,690 120,696" fill={c.patio} />
      <polygon points="136,672 718,668 740,690 120,696" fill="url(#cena-calcamento)" />
      <rect x="120" y="694" width="620" height="5" fill="#A8A198" />

      <rect x="150" y="512" width="44" height="152" fill="#1F3F9E" />
      <rect x="155" y="518" width="34" height="118" fill="#F4F4F2" />
      <text x="172" y="555" textAnchor="middle" fontWeight="800" fontSize="28" fill="#C8202A">G</text>
      <text x="172" y="600" textAnchor="middle" fontWeight="800" fontSize="28" fill="#E8B420">D</text>
      <rect x="150" y="638" width="44" height="26" fill="#C8202A" />

      {[236, 360].map((x) => (
        <g key={x}>
          <rect x={x} y="568" width="92" height="92" fill="#1F3F9E" />
          <rect x={x + 6} y="574" width="80" height="86" fill="#F4F4F2" />
          <rect x={x + 12} y="580" width="68" height="80" fill="#C8202A" />
          <rect x={x + 16} y="588" width="60" height="72" fill="#2B2E36" />
          <rect x={x + 30} y="600" width="30" height="60" rx="3" fill="#F4F4F2" />
          <rect x={x + 35} y="606" width="20" height="12" fill="#3C4A5C" />
        </g>
      ))}
      <rect x="382" y="558" width="48" height="12" fill="#1F3F9E" />
      <text x="406" y="567" textAnchor="middle" fontWeight="800" fontSize="8" fill="#E8C33A">FILTRO</text>

      <rect x="486" y="490" width="10" height="170" fill="#F4F4F2" />
      <rect x="496" y="490" width="80" height="170" fill="#C8202A" />
      <rect x="506" y="516" width="60" height="28" fill="#9FC2D6" />
      <rect x="506" y="584" width="60" height="28" fill="#9FC2D6" />
      <rect x="576" y="490" width="8" height="170" fill="#1F3F9E" />

      <rect x="210" y="424" width="470" height="8" fill="#1F3F9E" />
      <rect x="210" y="432" width="470" height="40" fill="#F4F4F2" />
      <text x="445" y="462" textAnchor="middle" fontWeight="800" fontSize="24" letterSpacing="1">
        <tspan fill="#1F3F9E">POSTO </tspan>
        <tspan fill="#C8202A">PROVIDÊNCIA</tspan>
      </text>
      <rect x="210" y="472" width="470" height="9" fill="#C8202A" />
      <rect x="210" y="481" width="470" height="10" fill="#3C3F47" />
      <polygon points="680,424 694,440 694,491 680,491" fill="#1F3F9E" />
      <rect x="668" y="491" width="10" height="169" fill="#C8202A" />
      <rect x="214" y="491" width="10" height="169" fill="#C8202A" />
      <g opacity={c.luz}>
        <circle cx="264" cy="492" r="34" fill="url(#cena-brilho)" />
        <circle cx="384" cy="492" r="34" fill="url(#cena-brilho)" />
        <circle cx="624" cy="492" r="34" fill="url(#cena-brilho)" />
      </g>
      <g fill="#FFF3D0">
        <rect x="250" y="489" width="28" height="3" rx="1.5" />
        <rect x="370" y="489" width="28" height="3" rx="1.5" />
        <rect x="610" y="489" width="28" height="3" rx="1.5" />
      </g>
    </g>
  </svg>
  );
};

export default CenaDaChegada;
