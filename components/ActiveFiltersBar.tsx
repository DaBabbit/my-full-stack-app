'use client';

import { X, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { SortConfig, FilterValue } from '@/hooks/useWorkspaceViews';

interface ActiveFiltersBarProps {
  filters: Record<string, FilterValue>;
  sorts: SortConfig[];
  onRemoveFilter: (field: string) => void;
  onRemoveSort: (field: string) => void;
  onUpdateSortPriority: (field: string, newPriority: number) => void;
  onEditFilter: (field: string) => void;
  // Label-Mapping für schöne Anzeige
  fieldLabels: Record<string, string>;
  // Personen-Mapping für readable Namen
  personMap?: Record<string, { firstname: string; lastname: string; email: string }>;
}

export function ActiveFiltersBar({
  filters,
  sorts,
  onRemoveFilter,
  onRemoveSort,
  onUpdateSortPriority,
  onEditFilter,
  fieldLabels,
  personMap = {},
}: ActiveFiltersBarProps) {
  // Wenn keine Filter und keine Sortierungen, nichts anzeigen
  const hasFilters = Object.keys(filters).length > 0;
  const hasSorts = sorts.length > 0;

  if (!hasFilters && !hasSorts) {
    return null;
  }

  const handleSortDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Finde die Sortierung die bewegt wurde
    const sortedSorts = [...sorts].sort((a, b) => a.priority - b.priority);
    const movedSort = sortedSorts[sourceIndex];

    // Update Prioritäten
    onUpdateSortPriority(movedSort.field, destinationIndex);
  };

  // Formatiere Filter-Werte für Anzeige
  const formatFilterValue = (field: string, value: FilterValue): string => {
    // Ignoriere null/undefined/boolean/number/string values
    if (!value || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value || '');
    }
    if (Array.isArray(value)) {
      if (field === 'responsible_person_id') {
        // Person IDs zu Namen
        return value.map(id => {
          if (id === 'unassigned') return 'Nicht zugewiesen';
          const person = personMap[id];
          if (!person) return id;
          return person.firstname && person.lastname
            ? `${person.firstname} ${person.lastname.charAt(0)}.`
            : person.email.split('@')[0];
        }).join(', ');
      }
      return value.join(', ');
    }
    
    if (typeof value === 'object' && value !== null) {
      // Datum Range
      if (value.from && value.to) {
        return `${new Date(value.from).toLocaleDateString('de-DE')} - ${new Date(value.to).toLocaleDateString('de-DE')}`;
      }
      if (value.from) {
        return `Ab ${new Date(value.from).toLocaleDateString('de-DE')}`;
      }
      if (value.to) {
        return `Bis ${new Date(value.to).toLocaleDateString('de-DE')}`;
      }
    }
    
    return String(value);
  };

  const sortedSorts = [...sorts].sort((a, b) => a.priority - b.priority);

  return (
    <div className="px-6 py-3 border-b border-neutral-700 bg-neutral-900/50">
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter Chips */}
        {Object.entries(filters).map(([field, value]) => (
          <button
            key={`filter-${field}`}
            onClick={() => onEditFilter(field)}
            className="group flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-xs text-blue-300 hover:bg-blue-600/30 hover:border-blue-500/50 transition-all"
          >
            <span className="font-medium">Filter:</span>
            <span>{fieldLabels[field] || field}</span>
            <span className="text-blue-400">=</span>
            <span className="max-w-[200px] truncate">{formatFilterValue(field, value)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFilter(field);
              }}
              className="ml-1 opacity-60 group-hover:opacity-100 hover:text-white transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </button>
        ))}

        {/* Sort Chips mit Drag & Drop */}
        {hasSorts && (
          <DragDropContext onDragEnd={handleSortDragEnd}>
            <Droppable droppableId="sorts" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex items-center gap-2"
                >
                  {sortedSorts.map((sort, index) => (
                    <Draggable
                      key={`sort-${sort.field}`}
                      draggableId={`sort-${sort.field}`}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`group flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-xs text-blue-300 transition-all ${
                            snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-500' : ''
                          }`}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-blue-400/60 hover:text-blue-400"
                          >
                            <GripVertical className="w-3 h-3" />
                          </div>
                          <span className="font-medium">Sortierung:</span>
                          <span>{fieldLabels[sort.field] || sort.field}</span>
                          {sort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )}
                          <span className="px-1.5 py-0.5 bg-blue-500/20 rounded text-blue-200 font-medium">
                            {index + 1}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveSort(sort.field);
                            }}
                            className="ml-1 opacity-60 group-hover:opacity-100 hover:text-white transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {/* Clear All Button */}
        {(hasFilters || hasSorts) && (
          <button
            onClick={() => {
              Object.keys(filters).forEach(onRemoveFilter);
              sorts.forEach(sort => onRemoveSort(sort.field));
            }}
            className="ml-2 px-3 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
          >
            Alle löschen
          </button>
        )}
      </div>
    </div>
  );
}

