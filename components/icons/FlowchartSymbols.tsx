import React from 'react';

const IslemIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><rect x="0.5" y="0.5" width="31" height="19" /></svg>
);
const OlcumIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><path d="M 16 1 L 31 19 L 1 19 Z" /></svg>
);
const IcDepolamaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><rect x="0.5" y="0.5" width="28" height="17" /><rect x="3.5" y="2.5" width="28" height="17" /></svg>
);
const ManuelIslemIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><path d="M 1 1 L 31 1 L 24 19 L 8 19 Z" /></svg>
);
const KararIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><path d="M 16 1 L 31 10 L 16 19 L 1 10 Z" /></svg>
);
const HazirlikIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><path d="M 8 1 H 24 L 31 10 L 24 19 H 8 L 1 10 Z" /></svg>
);
const VeriIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><path d="M 8 1 H 31 L 24 19 H 1 Z" /></svg>
);
const BeklemeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><path d="M 1 1 H 22 C 28 1, 28 19, 22 19 H 1 Z" /></svg>
);
const OncedenTanimliIslemIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><rect x="0.5" y="0.5" width="31" height="19" /><line x1="5" y1="0.5" x2="5" y2="19.5" /><line x1="27" y1="0.5" x2="27" y2="19.5" /></svg>
);
const BelgeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><path d="M 1 16 C 1 16, 8 10, 16 16 C 24 22, 31 16, 31 16 V 1 H 1 Z" /></svg>
);
const CokSayidaBelgeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}>
        <g transform="translate(0, 5)">
            <path d="M 1 12 C 1 12, 8 7, 16 12 C 24 17, 31 12, 31 12 V 1 H 1 Z" />
        </g>
        <g transform="translate(0, 2.5)">
            <path d="M 1 12 C 1 12, 8 7, 16 12 C 24 17, 31 12, 31 12 V 1 H 1 Z" />
        </g>
        <g>
            <path d="M 1 12 C 1 12, 8 7, 16 12 C 24 17, 31 12, 31 12 V 1 H 1 Z" />
        </g>
    </svg>
);
const OtekiIslemIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><rect x="0.5" y="0.5" width="31" height="19" rx="10" /></svg>
);
const StokIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><path d="M 1 1 L 31 1 L 16 19 Z" /></svg>
);
const TransferIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1" {...props}><path d="M 1 10 H 25 L 18 3 M 25 10 L 18 17" fill="none" /></svg>
);


export const flowchartSymbols: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    islem: IslemIcon,
    olcum: OlcumIcon,
    depolama: IcDepolamaIcon,
    manuel: ManuelIslemIcon,
    karar: KararIcon,
    hazirlik: HazirlikIcon,
    veri: VeriIcon,
    bekleme: BeklemeIcon,
    tanimli: OncedenTanimliIslemIcon,
    belge: BelgeIcon,
    cokbelge: CokSayidaBelgeIcon,
    oteki: OtekiIslemIcon,
    stok: StokIcon,
    transfer: TransferIcon,
};

export const symbolDefs = [
    { key: 'islem', label: 'İşlem', Icon: IslemIcon },
    { key: 'olcum', label: 'Ölçüm', Icon: OlcumIcon },
    { key: 'depolama', label: 'İç Depolama', Icon: IcDepolamaIcon },
    { key: 'manuel', label: 'Manuel İşlem', Icon: ManuelIslemIcon },
    { key: 'karar', label: 'Karar', Icon: KararIcon },
    { key: 'hazirlik', label: 'Hazırlık', Icon: HazirlikIcon },
    { key: 'veri', label: 'Veri', Icon: VeriIcon },
    { key: 'bekleme', label: 'Bekleme', Icon: BeklemeIcon },
    { key: 'tanimli', label: 'Önceden Tanımlı İşlem', Icon: OncedenTanimliIslemIcon },
    { key: 'belge', label: 'Belge', Icon: BelgeIcon },
    { key: 'cokbelge', label: 'Çok Sayıda Belge', Icon: CokSayidaBelgeIcon },
    { key: 'oteki', label: 'Öteki İşlem', Icon: OtekiIslemIcon },
    { key: 'stok', label: 'Stok (Hammade)', Icon: StokIcon },
    { key: 'transfer', label: 'Transfer', Icon: TransferIcon },
];