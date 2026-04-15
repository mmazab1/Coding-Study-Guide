import { useEditor, EditorContent } from '@tiptap/react'
import { useEffect } from 'react'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle, Color, FontFamily, FontSize, LineHeight } from '@tiptap/extension-text-style'
import { TextAlign } from '@tiptap/extension-text-align'
import EditorToolbar from './EditorToolbar'

export default function RichEditor({ initialContent = '', onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML(), editor.getText()),
  })

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent, false)
    }
  }, [initialContent])

  return (
    <div className="rich-editor-wrap">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="rich-editor-body" />
    </div>
  )
}
