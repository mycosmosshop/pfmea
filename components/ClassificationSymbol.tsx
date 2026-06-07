
import React from 'react';
import type { RegistryData } from '../types';
import { SvgIconRenderer } from './icons/Icons';
import { symbols as standardSymbols } from './icons/ClassificationSymbols';

interface ClassificationSymbolProps {
    symbolKey?: string;
    registryData?: RegistryData;
    className?: string;
}

export const ClassificationSymbol: React.FC<ClassificationSymbolProps> = ({ symbolKey, registryData, className = 'h-6 w-6' }) => {
    if (!symbolKey) return null;

    const customSymbol = registryData?.classificationSymbols?.find(s => s.key === symbolKey);
    if (customSymbol) {
        return <SvgIconRenderer svgString={customSymbol.svgString} className={className} />;
    }
    
    const StandardSymbolComponent = standardSymbols[symbolKey];
    if (StandardSymbolComponent) {
        return <StandardSymbolComponent className={className} />;
    }

    return <span className="text-sm font-bold">{symbolKey}</span>;
}
