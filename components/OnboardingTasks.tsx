'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, User, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import { OnboardingTask } from '@/hooks/useOnboarding';

interface OnboardingTasksProps {
  tasks: OnboardingTask[];
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
}

export default function OnboardingTasks({
  tasks,
  completedCount,
  totalCount,
  progressPercentage
}: OnboardingTasksProps) {
  const router = useRouter();

  const getTaskIcon = (iconName: string) => {
    switch (iconName) {
      case 'user':
        return User;
      case 'video':
        return Video;
      default:
        return Circle;
    }
  };

  const handleTaskClick = (task: OnboardingTask) => {
    if (task.link && !task.completed) {
      router.push(task.link);
    }
  };

  if (completedCount === totalCount) {
    return null; // Don't show if all tasks are completed
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-white font-semibold mb-1">Erste Schritte</h3>
        <p className="text-neutral-400 text-xs">
          {completedCount} von {totalCount} Aufgaben erledigt
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map((task, index) => {
          const TaskIcon = getTaskIcon(task.icon || 'circle');
          
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => handleTaskClick(task)}
                disabled={task.completed}
                className={`w-full p-3 rounded-xl border transition-all duration-300 text-left ${
                  task.completed
                    ? 'bg-neutral-800/30 border-neutral-700/50 cursor-default'
                    : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 cursor-pointer'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <TaskIcon className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm mb-0.5 ${
                      task.completed ? 'text-neutral-500 line-through' : 'text-white'
                    }`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {task.description}
                    </p>
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Completion Message */}
      {completedCount > 0 && completedCount < totalCount && (
        <div className="mt-4 pt-4 border-t border-neutral-700">
          <p className="text-xs text-neutral-400 text-center">
            Noch {totalCount - completedCount} Aufgabe{totalCount - completedCount !== 1 ? 'n' : ''} bis zur Vervollständigung! 🎉
          </p>
        </div>
      )}
    </div>
  );
}

