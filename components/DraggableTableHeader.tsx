'use client';

import { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, ArrowUp, ArrowDown, Filter as FilterIcon } from 'lucide-react';
import type { ColumnConfig } from './TableColumnsSettings';
import type { SortConfig } from '@/hooks/useWorkspaceViews';

/**
 * Helper function to get visible columns in the correct order
 * Use this in tbody to render cells in the same order as headers
 */
export function getVisibleColumnOrder(
  columns: ColumnConfig[],
  columnOrder: string[],
  hiddenColumns: string[]
): ColumnConfig[] {
  return columnOrder
    .map(id => columns.find(col => col.id === id))
    .filter((col): col is ColumnConfig => col !== undefined && !hiddenColumns.includes(col.id));
}

interface DraggableTableHeaderProps {
  columns: ColumnConfig[];
  columnOrder: string[];
  hiddenColumns: string[];
  onColumnOrderChange: (newOrder: string[]) => void;
  onColumnResize?: (columnId: string, width: number) => void;
  columnWidths?: Record<string, number>;
  children: (column: ColumnConfig, width?: number) => React.ReactNode;
  // Neue Props für Filter/Sort
  onHeaderClick?: (columnId: string, element: HTMLElement) => void;
  activeFilters?: Record<string, any>;
  activeSorts?: SortConfig[];
}

/**
 * Draggable Table Header mit Drag & Drop und Resize Support
 * 
 * Features:
 * - Drag & Drop für Spalten-Reihenfolge
 * - Resize Handles für Spaltenbreite
 * - Mobile Support (Long-Press)
 * - Fixed Columns (können nicht verschoben werden)
 */
export function DraggableTableHeader({
  columns,
  columnOrder,
  hiddenColumns,
  onColumnOrderChange,
  onColumnResize,
  columnWidths = {},
  children,
  onHeaderClick,
  activeFilters = {},
  activeSorts = []
}: DraggableTableHeaderProps) {
  const [resizing, setResizing] = useState<{ columnId: string; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableRowElement>(null);
  const headerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sortiere Spalten nach columnOrder und filtere hidden columns
  const visibleColumns = columnOrder
    .map(id => columns.find(col => col.id === id))
    .filter((col): col is ColumnConfig => col !== undefined && !hiddenColumns.includes(col.id));

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(columnOrder);
    const sourceIndex = items.indexOf(result.draggableId);
    const destinationIndex = items.indexOf(columnOrder[result.destination.index]);

    // Verschiebe nur wenn nicht fixed
    const sourceColumn = columns.find(col => col.id === result.draggableId);
    if (sourceColumn?.fixed) return;

    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(destinationIndex, 0, reorderedItem);

    onColumnOrderChange(items);
  };

  // Resize Handlers
  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    const currentWidth = columnWidths[columnId] || 200; // Default width
    setResizing({ columnId, startX: e.clientX, startWidth: currentWidth });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing || !onColumnResize) return;

      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(100, resizing.startWidth + diff); // Min 100px
      
      // Update width in real-time (debounced save happens in parent)
      onColumnResize(resizing.columnId, newWidth);
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, onColumnResize]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="table-columns" direction="horizontal">
        {(provided, snapshot) => (
          <tr
            ref={(el) => {
              provided.innerRef(el);
              if (el && tableRef) {
                tableRef.current = el;
              }
            }}
            {...provided.droppableProps}
            className={snapshot.isDraggingOver ? 'bg-blue-500/5' : ''}
          >
            {visibleColumns.map((column, index) => {
              const width = columnWidths[column.id];

              return (
                  <Draggable
                    key={column.id}
                    draggableId={column.id}
                    index={index}
                    isDragDisabled={column.fixed}
                  >
                    {(provided, snapshot) => (
                      <th
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`px-4 py-4 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider border-b border-neutral-700 relative ${
                          snapshot.isDragging ? 'bg-blue-500/10 shadow-lg z-[9999]' : ''
                        } ${column.fixed ? 'bg-neutral-900/50' : 'cursor-move'}`}
                        style={{
                          ...provided.draggableProps.style,
                          width: width ? `${width}px` : undefined,
                          minWidth: column.fixed ? undefined : '100px',
                          ...(snapshot.isDragging && {
                            position: 'fixed',
                            top: 'auto',
                            left: 'auto'
                          })
                        }}
                      >
                      <div className="flex items-center justify-between group">
                        {/* Drag Handle */}
                        {!column.fixed && (
                          <div
                            {...provided.dragHandleProps}
                            className="mr-2 text-neutral-600 group-hover:text-neutral-400 transition-colors cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                        )}

                        {/* Column Content - Clickable für Dropdown */}
                        <div 
                          ref={el => headerRefs.current[column.id] = el}
                          className="flex-1 flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
                          onClick={(e) => {
                            // Nur für nicht-fixed Spalten (außer checkbox und actions)
                            if (!column.fixed && column.id !== 'checkbox' && column.id !== 'actions' && onHeaderClick) {
                              e.stopPropagation();
                              const element = headerRefs.current[column.id];
                              if (element) {
                                onHeaderClick(column.id, element);
                              }
                            }
                          }}
                        >
                          {children(column, width)}
                          
                          {/* Sort Indicator */}
                          {(() => {
                            const sort = activeSorts.find(s => s.field === column.id);
                            if (sort) {
                              return (
                                <div className="flex items-center gap-0.5 text-purple-400">
                                  {sort.direction === 'asc' ? (
                                    <ArrowUp className="w-3 h-3" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3" />
                                  )}
                                  <span className="text-[10px] font-bold">{sort.priority + 1}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          
                          {/* Filter Indicator */}
                          {activeFilters[column.id] && (
                            <FilterIcon className="w-3 h-3 text-blue-400" />
                          )}
                        </div>

                        {/* Resize Handle */}
                        {column.resizable && onColumnResize && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                            onMouseDown={(e) => handleResizeStart(e, column.id)}
                            style={{
                              touchAction: 'none'
                            }}
                          >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-neutral-600 group-hover:bg-blue-500 transition-colors rounded-full" />
                          </div>
                        )}
                      </div>
                    </th>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </tr>
        )}
      </Droppable>
    </DragDropContext>
  );
}

