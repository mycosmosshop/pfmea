
import React from 'react';

const DiamondIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 2 L6 12 L12 22 L18 12 Z" />
    </svg>
);

const CircleTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="#E9E9E9" stroke="black" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 17 L8 8 L16 8 Z" fill="white" />
    </svg>
);

const HexagonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="#E9E9E9" stroke="black" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M9 6 H 15 L 19 12 L 15 18 H 9 L 5 12 Z" />
    </svg>
);

const HouseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" strokeWidth="1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4 10 L12 3 L20 10 V 20 H 4 Z" />
    </svg>
);

const ShieldIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="#E9E9E9" stroke="black" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M5,5 C5,3 6,2 8,2 h8 c2,0 3,1 3,3 v6 c0,3 -2,6 -5,7.5 l-2,1.5 l-2,-1.5 C7,17 5,14 5,11 V5Z" />
    </svg>
);

const TriangleDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="#E9E9E9" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4 8 L12 20 L20 8 Z" />
    </svg>
);

const CircleTriangleSIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 32 32" {...props}>
        <g transform="translate(2, 2)">
             <g fill="#E9E9E9" stroke="black" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="14" cy="14" r="9" />
                <path d="M14 19 L10 10 L18 10 Z" fill="white" />
            </g>
            <text x="24" y="11" fontSize="8" stroke="none" fill="black" fontWeight="500">S</text>
        </g>
    </svg>
);

const CircleTriangleRIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
     <svg viewBox="0 0 32 32" {...props}>
        <g transform="translate(2, 2)">
             <g fill="#E9E9E9" stroke="black" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="14" cy="14" r="9" />
                <path d="M14 19 L10 10 L18 10 Z" fill="white" />
            </g>
            <text x="24" y="21" fontSize="8" stroke="none" fill="black" fontWeight="500">R</text>
        </g>
    </svg>
);

const CircleTriangleSRIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
     <svg viewBox="0 0 32 32" {...props}>
        <g transform="translate(2, 2)">
             <g fill="#E9E9E9" stroke="black" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="14" cy="14" r="9" />
                <path d="M14 19 L10 10 L18 10 Z" fill="white"/>
            </g>
            <text x="24" y="11" fontSize="8" stroke="none" fill="black" fontWeight="500">S</text>
            <text x="24" y="21" fontSize="8" stroke="none" fill="black" fontWeight="500">R</text>
        </g>
    </svg>
);

// Üç yıldız özel karakteristik (***) — web'de üç yıldız çizilir; dışa aktarımda metin "***" olur (key='***').
const ThreeStarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const star = "M0,-3.4 0.99,-1.05 3.23,-1.05 1.31,0.4 2,2.75 0,1.31 -2,2.75 -1.31,0.4 -3.23,-1.05 -0.99,-1.05 Z";
    return (
        <svg viewBox="0 0 24 24" {...props}>
            <g fill="currentColor" stroke="none">
                <path d={star} transform="translate(5,12)" />
                <path d={star} transform="translate(12,12)" />
                <path d={star} transform="translate(19,12)" />
            </g>
        </svg>
    );
};

export const PlusSymbol: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" strokeWidth="2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="12" y1="6" x2="12" y2="18"></line>
        <line x1="6" y1="12" x2="18" y2="12"></line>
    </svg>
);


export const symbols: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    'diamond': DiamondIcon,
    'circle-triangle': CircleTriangleIcon,
    'hexagon': HexagonIcon,
    'house': HouseIcon,
    'shield': ShieldIcon,
    'triangle-down': TriangleDownIcon,
    'circle-triangle-s': CircleTriangleSIcon,
    'circle-triangle-r': CircleTriangleRIcon,
    'circle-triangle-sr': CircleTriangleSRIcon,
    '***': ThreeStarIcon,
    'plus': PlusSymbol,
};
