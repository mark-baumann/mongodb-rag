'use client';

import React, { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import DocumentItem from './DocumentItem';
import FolderItem from './FolderItem';

function SortableItem(props: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (props.type === 'folder') {
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <FolderItem folderName={props.item.name} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DocumentItem document={props.item} />
    </div>
  );
}

export default function DraggableDocumentList({ documents, folders }: { documents: any[], folders: any[] }) {
  const [items, setItems] = useState(() => {
    const folderItems = folders.map(name => ({ id: `folder-${name}`, name, type: 'folder' }));
    const documentItems = documents.map(doc => ({ ...doc, id: doc.documentId, type: 'document' }));
    return [...folderItems, ...documentItems];
  });

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeItem = items.find((item) => item.id === active.id);
      const overItem = items.find((item) => item.id === over.id);

      if (activeItem && overItem && activeItem.type === 'document' && overItem.type === 'folder') {
        try {
          const response = await fetch('/api/move-file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              documentId: activeItem.documentId,
              name: activeItem.name,
              folderName: overItem.name,
            }),
          });

          if (response.ok) {
            alert(`Datei "${activeItem.name}" wurde in den Ordner "${overItem.name}" verschoben.`);
            window.location.reload();
          } else {
            const data = await response.json();
            alert(`Fehler beim Verschieben der Datei: ${data.message}`);
          }
        } catch (error) {
          console.error('Fehler beim Verschieben der Datei:', error);
          alert('Beim Verschieben der Datei ist ein Fehler aufgetreten.');
        }
      }
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul className='space-y-3'>
          {items.map(item => (
            <SortableItem key={item.id} id={item.id} item={item} type={item.type} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}