import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check, Tag, Layers, User, Package, Wrench } from 'lucide-react';

export interface ComboboxOption {
  id: string;
  name: string;
  code?: string;
  internalCode?: string;
  sector?: string;
  price?: number;
  stock?: number;
  type?: 'product' | 'service';
  discountPercent?: number;
  extraInfo?: string;
}

interface SearchableComboboxProps {
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  showStock?: boolean;
  showPrice?: boolean;
  itemType?: 'client' | 'product' | 'service';
  className?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  label,
  placeholder = 'Selecione uma opção...',
  searchPlaceholder = 'Buscar por nome, código ou setor...',
  options,
  value,
  onChange,
  showStock = false,
  showPrice = false,
  itemType = 'product',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Selected item object
  const selectedOption = useMemo(() => {
    return options.find(opt => opt.id === value);
  }, [options, value]);

  // Distinct sectors available in options
  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    options.forEach(opt => {
      if (opt.sector && opt.sector.trim()) {
        set.add(opt.sector.trim());
      }
    });
    return Array.from(set);
  }, [options]);

  // Filtered options based on search query (name, code, internalCode, sector, extraInfo)
  const filteredOptions = useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();
    
    return options.filter(opt => {
      // Sector pill filter
      if (selectedSectorFilter !== 'all' && opt.sector?.toLowerCase() !== selectedSectorFilter.toLowerCase()) {
        return false;
      }

      if (!cleanQuery) return true;

      const nameMatch = opt.name.toLowerCase().includes(cleanQuery);
      const codeMatch = Boolean(opt.code && opt.code.toLowerCase().includes(cleanQuery));
      const internalCodeMatch = Boolean(opt.internalCode && opt.internalCode.toLowerCase().includes(cleanQuery));
      const sectorMatch = Boolean(opt.sector && opt.sector.toLowerCase().includes(cleanQuery));
      const extraMatch = Boolean(opt.extraInfo && opt.extraInfo.toLowerCase().includes(cleanQuery));

      return nameMatch || codeMatch || internalCodeMatch || sectorMatch || extraMatch;
    });
  }, [options, query, selectedSectorFilter]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setQuery('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSelect = (option: ComboboxOption) => {
    onChange(option.id);
    setIsOpen(false);
    setQuery('');
    setSelectedSectorFilter('all');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setSelectedSectorFilter('all');
  };

  const getItemIcon = () => {
    if (itemType === 'client') return <User className="w-4 h-4 text-sky-600 shrink-0" />;
    if (itemType === 'service') return <Wrench className="w-4 h-4 text-amber-600 shrink-0" />;
    return <Package className="w-4 h-4 text-emerald-600 shrink-0" />;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Area */}
      {!isOpen ? (
        <div
          onClick={handleOpen}
          className={`min-h-[42px] px-3 py-2 bg-white border rounded-lg cursor-pointer flex items-center justify-between gap-2 transition-all shadow-2xs ${
            selectedOption
              ? 'border-sky-300 ring-1 ring-sky-200 hover:border-sky-400'
              : 'border-slate-300 hover:border-slate-400'
          }`}
          title="Clique para pesquisar por nome, código ou setor"
        >
          {selectedOption ? (
            <div className="flex items-center gap-2 flex-grow min-w-0">
              {getItemIcon()}
              
              <div className="flex items-center gap-1.5 flex-wrap flex-grow min-w-0">
                {selectedOption.code && (
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 shrink-0">
                    {selectedOption.code}
                  </span>
                )}
                {selectedOption.internalCode && (
                  <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                    Int: {selectedOption.internalCode}
                  </span>
                )}
                {selectedOption.sector && (
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    {selectedOption.sector}
                  </span>
                )}
                <span className="text-sm font-medium text-slate-900 truncate">
                  {selectedOption.name}
                </span>
              </div>

              {/* Price / Stock Pill */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {showStock && typeof selectedOption.stock === 'number' && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    selectedOption.stock > 0 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    Estoque: {selectedOption.stock}
                  </span>
                )}
                {showPrice && typeof selectedOption.price === 'number' && (
                  <span className="text-xs font-bold text-slate-900">
                    R$ {selectedOption.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{placeholder}</span>
            </div>
          )}

          {/* Action Icons */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {selectedOption && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title="Limpar seleção"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      ) : (
        /* Active Search Input Trigger */
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-sky-600 absolute left-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-16 py-2.5 text-sm bg-white border-2 border-sky-500 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200 text-slate-900"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                  title="Limpar texto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Results Box */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header Bar with Search Hint & Sector Chips */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-medium">
                <Search className="w-3 h-3 text-sky-600" />
                Filtrando por <strong>Nome</strong>, <strong>Código</strong> ou <strong>Setor</strong>
              </span>
              <span className="font-semibold text-slate-600">
                {filteredOptions.length} de {options.length} item(ns)
              </span>
            </div>

            {/* Sector Quick-Filter Chips */}
            {availableSectors.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 text-[11px] no-scrollbar">
                <span className="text-[10px] text-slate-400 uppercase font-bold mr-1 shrink-0">Setor:</span>
                <button
                  type="button"
                  onClick={() => setSelectedSectorFilter('all')}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-colors ${
                    selectedSectorFilter === 'all'
                      ? 'bg-sky-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Todos
                </button>
                {availableSectors.map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSectorFilter(sec === selectedSectorFilter ? 'all' : sec)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-colors ${
                      selectedSectorFilter === sec
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.id === value;

                return (
                  <div
                    key={option.id}
                    onClick={() => handleSelect(option)}
                    className={`px-3 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors text-left ${
                      isSelected
                        ? 'bg-sky-50 text-sky-950 font-medium'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-grow min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {getItemIcon()}
                      </div>

                      <div className="space-y-0.5 flex-grow min-w-0">
                        {/* Badges Row: Code, Internal Code, Sector */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {option.code && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                              Cód: {option.code}
                            </span>
                          )}
                          {option.internalCode && (
                            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Cód. Int: {option.internalCode}
                            </span>
                          )}
                          {option.sector && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                              <Tag className="w-2.5 h-2.5" />
                              {option.sector}
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <div className="text-sm font-semibold text-slate-900 leading-snug">
                          {option.name}
                        </div>

                        {/* Extra info (phone, doc, observation, etc.) */}
                        {option.extraInfo && (
                          <div className="text-xs text-slate-500 truncate">
                            {option.extraInfo}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right column: Stock & Price */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {showPrice && typeof option.price === 'number' && (
                        <span className="text-sm font-bold text-slate-900">
                          R$ {option.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}

                      {showStock && typeof option.stock === 'number' && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          option.stock > 0 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {option.stock > 0 ? `${option.stock} em estoque` : 'Esgotado (0)'}
                        </span>
                      )}

                      {isSelected && (
                        <span className="text-xs text-sky-600 font-semibold flex items-center gap-0.5 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                          Selecionado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                <Search className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700">Nenhum resultado encontrado</p>
                <p className="text-slate-400">
                  Nenhum item corresponde a <strong>"{query}"</strong> por nome, código ou setor.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
