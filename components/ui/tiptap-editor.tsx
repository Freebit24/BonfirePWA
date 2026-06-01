'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, LinkIcon, List } from 'lucide-react';
import { useEffect } from 'react';
import './tiptap-editor.css';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function TipTapEditor({ content, onChange, placeholder }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-orange-500 underline',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[200px] px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content when prop changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor?.chain().focus().toggleUnderline().run();
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  
  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-zinc-800 bg-zinc-900/80">
        <button
          type="button"
          onClick={toggleBold}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('bold')
              ? 'bg-orange-500/20 text-orange-500'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          aria-label="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={toggleItalic}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('italic')
              ? 'bg-orange-500/20 text-orange-500'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          aria-label="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={toggleUnderline}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('underline')
              ? 'bg-orange-500/20 text-orange-500'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          aria-label="Underline"
        >
          <UnderlineIcon size={16} />
        </button>
        <div className="w-px h-5 bg-zinc-800 mx-1" />
        <button
          type="button"
          onClick={addLink}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('link')
              ? 'bg-orange-500/20 text-orange-500'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          aria-label="Add Link"
        >
          <LinkIcon size={16} />
        </button>
        <button
          type="button"
          onClick={toggleBulletList}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-orange-500/20 text-orange-500'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          aria-label="Bullet List"
        >
          <List size={16} />
        </button>
      </div>
      
      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
