
import React from 'react';

export const Line: React.FC<{ from: 'left' | 'right' }> = ({ from }) => (
    <div className={`absolute top-1/2 ${from === 'left' ? 'right-full' : 'left-full'} w-6 h-px bg-gray-400`}></div>
);
