import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FolderPlus, Tag } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { addCustomFolder } from '../../services/inboxFolderService';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated: () => void;
}

const PRESET_COLORS = [
  { name: 'Sky Blue', hex: '#0284c7' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Rose Red', hex: '#f43f5e' },
  { name: 'Amber Orange', hex: '#f59e0b' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Slate Gray', hex: '#64748b' },
];

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onFolderCreated
}) => {
  const { toast } = useToast();
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].hex);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      toast.warning('Please enter a folder name');
      return;
    }

    try {
      const created = addCustomFolder(folderName.trim(), selectedColor);
      toast.success(`Created custom folder "${created.label}"`);
      setFolderName('');
      onFolderCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create folder');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Custom Inbox Folder" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Folder Name *
          </label>
          <input
            type="text"
            required
            autoFocus
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="e.g. Shortlisted Candidates, Urgent Review, Tech Hires..."
            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            You can drag & drop any email thread into this folder.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>Folder Badge Color</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setSelectedColor(c.hex)}
                className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                  selectedColor === c.hex ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              >
                {selectedColor === c.hex && (
                  <span className="w-2 h-2 bg-white rounded-full shadow-xs" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
          <Button size="sm" type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-semibold">
            <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
            Create Folder
          </Button>
        </div>
      </form>
    </Modal>
  );
};
