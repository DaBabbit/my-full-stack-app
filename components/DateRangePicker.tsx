'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRangePickerProps {
  value: { from?: string; to?: string };
  onChange: (range: { from?: string; to?: string }) => void;
  onClose: () => void;
}

export function DateRangePicker({ value, onChange, onClose }: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedFrom, setSelectedFrom] = useState<Date | null>(
    value.from ? new Date(value.from) : null
  );
  const [selectedTo, setSelectedTo] = useState<Date | null>(
    value.to ? new Date(value.to) : null
  );
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  // selectingFrom: true wenn noch kein "Von" gesetzt ist
  const selectingFrom = !selectedFrom;

  // Monats-Namen
  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  // Erste Woche des Monats
  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfWeek = firstDay.getDay();
    // Montag = 0, Sonntag = 6
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  };

  // Tage im Monat
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Prüfe ob Datum im Range liegt
  const isInRange = (date: Date): boolean => {
    if (!selectedFrom || !selectedTo) return false;
    return date >= selectedFrom && date <= selectedTo;
  };

  // Prüfe ob Datum der Start ist
  const isStartDate = (date: Date): boolean => {
    if (!selectedFrom) return false;
    return date.toDateString() === selectedFrom.toDateString();
  };

  // Prüfe ob Datum das Ende ist
  const isEndDate = (date: Date): boolean => {
    if (!selectedTo) return false;
    return date.toDateString() === selectedTo.toDateString();
  };

  // Prüfe ob Datum heute ist
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Prüfe ob Datum im aktuellen Monat liegt
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth() &&
           date.getFullYear() === currentMonth.getFullYear();
  };

  // Handle Date Click
  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    if (!selectedFrom) {
      // Erster Klick - "Von" auswählen
      setSelectedFrom(clickedDate);
      setSelectedTo(null);
    } else {
      // Zweiter Klick - "Bis" auswählen
      if (clickedDate < selectedFrom) {
        // Wenn früher als "Von", tausche die Werte
        setSelectedTo(selectedFrom);
        setSelectedFrom(clickedDate);
      } else {
        setSelectedTo(clickedDate);
      }
      // Range ist komplett - speichere und schließe
      onChange({
        from: selectedFrom.toISOString().split('T')[0],
        to: clickedDate.toISOString().split('T')[0]
      });
      setTimeout(() => {
        onClose();
      }, 200);
    }
  };

  // Handle Hover
  const handleDateHover = (day: number) => {
    if (selectedFrom && !selectedTo) {
      const hoveredDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      setHoverDate(hoveredDate);
    }
  };

  // Render Calendar Grid
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days: (number | null)[] = [];

    // Leere Zellen für Tage vor dem 1. des Monats
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Tage des Monats
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days.map((day, index) => {
      if (day === null) {
        return <div key={`empty-${index}`} className="h-10" />;
      }

      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const inRange = selectedFrom && selectedTo && isInRange(date);
      const isStart = isStartDate(date);
      const isEnd = isEndDate(date);
      const isHoverRange = selectedFrom && !selectedTo && hoverDate && 
        ((date >= selectedFrom && date <= hoverDate) || (date >= hoverDate && date <= selectedFrom));
      const today = isToday(date);
      const currentMonthDay = isCurrentMonth(date);

      // Bestimme die CSS-Klassen für die visuelle Darstellung
      let dateClasses = 'h-10 w-10 text-sm font-medium transition-all relative flex items-center justify-center';
      
      // Basis-Styling
      if (!currentMonthDay) {
        dateClasses += ' text-neutral-600';
      } else {
        dateClasses += ' text-white';
      }
      
      // Range-Styling
      if (isStart) {
        dateClasses += ' bg-blue-600 text-white font-semibold rounded-full z-10';
      } else if (isEnd) {
        dateClasses += ' bg-blue-600 text-white font-semibold rounded-full z-10';
      } else if (inRange) {
        dateClasses += ' bg-blue-500/30 text-white rounded-none';
      } else if (isHoverRange) {
        dateClasses += ' bg-blue-500/20 text-white rounded-none';
      } else if (today) {
        dateClasses += ' bg-neutral-700/30 text-white rounded-full';
      } else {
        dateClasses += ' hover:bg-neutral-700/50 rounded-full';
      }

      return (
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          onMouseEnter={() => handleDateHover(day)}
          className={dateClasses}
        >
          {day}
        </button>
      );
    });
  };

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl p-4 w-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-1 hover:bg-neutral-800 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-neutral-400" />
          </button>
          <h3 className="text-sm font-medium text-white min-w-[140px] text-center">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-neutral-800 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-800 rounded transition-colors"
        >
          <X className="w-4 h-4 text-neutral-400" />
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="h-8 flex items-center justify-center text-xs text-neutral-400 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendar()}
      </div>

      {/* Info Text */}
      <div className="mt-4 pt-4 border-t border-neutral-700">
        <p className="text-xs text-neutral-400 text-center">
          {selectingFrom || !selectedFrom
            ? 'Klicken Sie auf ein Datum für "Von"'
            : selectedFrom && !selectedTo
              ? `Von: ${selectedFrom.toLocaleDateString('de-DE')} - Klicken Sie auf ein Datum für "Bis"`
              : selectedFrom && selectedTo
                ? `Zeitraum: ${selectedFrom.toLocaleDateString('de-DE')} - ${selectedTo.toLocaleDateString('de-DE')}`
                : 'Wählen Sie einen Zeitraum'}
        </p>
        {(selectedFrom || selectedTo) && (
          <button
            onClick={() => {
              setSelectedFrom(null);
              setSelectedTo(null);
              onChange({});
            }}
            className="mt-2 w-full text-xs text-neutral-400 hover:text-white transition-colors"
          >
            Zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}

